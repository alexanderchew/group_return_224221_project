from __future__ import annotations

import fcntl
import shutil
import threading
from datetime import UTC, datetime
from collections import Counter
from pathlib import Path

from .core import Problem, Settings, Store, digest, now, uid
from .media import audio_chunk
from .providers import PROMPT_VERSION, Classifier, Providers, normalize_transcript
from .schemas import GeneratedPack
from .study_content import OUTPUT_PROCESSING_VERSION, assemble_metadata, assemble_quiz

ACTIVE = {"preparing_audio", "transcribing", "analysing", "generating", "validating"}


def validate_generated(pack: GeneratedPack, segments: list[dict]):
    ids = {s["id"] for s in segments}
    refs = [pack.metadata.evidence_segment_ids]
    refs += [t.evidence_segment_ids for t in pack.metadata.topics]
    refs += [p.evidence_segment_ids for section in pack.notes for p in section.points]
    prompts = set()
    for question in pack.questions:
        refs.append(question.evidence_segment_ids)
        option_ids = [o.id for o in question.options]
        texts = [o.text.strip().casefold() for o in question.options]
        if len(set(option_ids)) != 4 or len(set(texts)) != 4 or question.correct_option_id not in option_ids:
            raise Problem("invalid_generated_output", "Generated question options/key are inconsistent.")
        if question.prompt.strip().casefold() in prompts:
            raise Problem("invalid_generated_output", "Generated questions contain duplicates.")
        prompts.add(question.prompt.strip().casefold())
    if any(not ref or not set(ref) <= ids for ref in refs):
        raise Problem("invalid_generated_output", "Generated content references missing transcript evidence.")


class Worker:
    def __init__(self, settings: Settings, store: Store, providers: Providers):
        self.settings, self.store, self.providers = settings, store, providers
        self.classifier = Classifier(settings)
        self.stop_event = threading.Event()
        self.thread = None
        self._lease = None

    def start(self):
        self._lease = (self.settings.data_dir / "worker.lock").open("a")
        try:
            fcntl.flock(self._lease, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self._lease.close()
            raise RuntimeError("A worker already owns this demo data directory.") from None
        self.recover()
        self.thread = threading.Thread(target=self.loop, name="lecture-worker", daemon=True)
        self.thread.start()

    def close(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=3)
        if self._lease and (not self.thread or not self.thread.is_alive()):
            self._lease.close()

    def recover(self):
        expired_uploads = []
        with self.store.tx() as cx:
            for upload in self.store.list(cx, "upload"):
                if upload["state"] != "completed" and datetime.fromisoformat(upload["expires_at"]) <= datetime.now(UTC):
                    expired_uploads.append(upload["id"])
            cx.execute("UPDATE reservations SET status='uncertain' WHERE status='reserved'")
            for job in self.store.list(cx, "job"):
                if job["status"] in ACTIVE:
                    job.update(status="failed", updated_at=now(), error=Problem(
                        "processing_interrupted", "The server restarted. Saved stages remain available for explicit retry.",
                        retryable=True, stage=job.get("stage")).payload())
                    self.store.put(cx, "job", job, job["recording_id"])

        for upload_id in expired_uploads:
            shutil.rmtree(self.settings.data_dir / "uploads" / upload_id, ignore_errors=True)

    def loop(self):
        while not self.stop_event.is_set():
            try:
                did_work = self.run_once()
            except Exception:
                # Never log raw provider exception objects or private request payloads.
                did_work = False
            if not did_work:
                self.stop_event.wait(0.3)

    def check(self, job_id: str) -> tuple[dict, dict]:
        with self.store.tx() as cx:
            job = self.store.get(cx, job_id, "job")
            if not job or job["status"] == "canceled":
                raise Problem("deleted", "This work was canceled or removed.", 404)
            return job, self.store.recording(cx, job["recording_id"])

    def update(self, job_id: str, **changes):
        with self.store.tx() as cx:
            job = self.store.get(cx, job_id, "job")
            if not job or job["status"] == "canceled":
                raise Problem("deleted", "This work was canceled or removed.", 404)
            self.store.recording(cx, job["recording_id"])
            if changes.get("stage") and (job.get("stage") != changes["stage"] or changes.get("status") != job.get("status")):
                job.setdefault("stage_attempts", []).append({"stage": changes["stage"], "status": changes.get("status"), "started_at": now()})
            job.update(changes, updated_at=now())
            self.store.put(cx, "job", job, job["recording_id"])

    def cached(self, cache_id: str):
        with self.store.tx() as cx:
            return self.store.get(cx, cache_id, "checkpoint")

    def checkpoint(self, job_id: str, cache_id: str, payload: dict):
        job, _ = self.check(job_id)
        with self.store.tx() as cx:
            self.store.recording(cx, job["recording_id"])
            current = self.store.get(cx, job_id, "job")
            if not current or current["status"] == "canceled":
                raise Problem("deleted", "Canceled work cannot publish results.", 404)
            self.store.put(cx, "checkpoint", {"id": cache_id, "payload": payload, "created_at": now()}, job["recording_id"])

    def save_transcript(self, job_id: str, segments: list[dict], covered_end: float, complete: bool):
        job, recording = self.check(job_id)
        revision = {"id": uid("transcript"), "recording_id": recording["id"],
                    "parent_revision_id": job.get("transcript_revision_id"), "origin": "provider",
                    "created_at": now(), "provider": "elevenlabs", "model": self.settings.scribe_model,
                    "segments": segments, "_complete": complete,
                    "coverage": {"source_duration_seconds": recording["duration_seconds"],
                                 "covered_intervals": [[0, covered_end]],
                                 "gaps": [] if complete else [[covered_end, recording["duration_seconds"]]]}}
        with self.store.tx() as cx:
            current = self.store.recording(cx, recording["id"])
            live_job = self.store.get(cx, job_id, "job")
            if not live_job or live_job["status"] == "canceled":
                raise Problem("deleted", "Canceled work cannot publish results.", 404)
            self.store.put(cx, "transcript", revision, recording["id"])
            if current.get("current_transcript_revision_id") == job.get("transcript_revision_id"):
                current["current_transcript_revision_id"] = revision["id"]
                current["revision"] += 1
                self.store.put(cx, "recording", current)
            live_job["transcript_revision_id"] = revision["id"]
            self.store.put(cx, "job", live_job, recording["id"])
        return revision

    def run_once(self) -> bool:
        with self.store.tx() as cx:
            queued = [j for j in reversed(self.store.list(cx, "job")) if j["status"] == "queued"]
            if not queued:
                return False
            job = queued[0]
            job.update(status="preparing_audio", stage="validate_media", updated_at=now())
            self.store.put(cx, "job", job, job["recording_id"])
        try:
            self.process(job["id"])
        except Problem as error:
            with self.store.tx() as cx:
                current = self.store.get(cx, job["id"], "job")
                if current and current["status"] != "canceled":
                    error.stage = error.stage or current.get("stage")
                    current.update(status="blocked" if error.code in {"provider_not_configured", "budget_exceeded", "price_configuration_required"} else "failed",
                                   error=error.payload(), updated_at=now())
                    self.store.put(cx, "job", current, current["recording_id"])
        except Exception:
            try:
                self.update(job["id"], status="failed", error=Problem(
                    "processing_failed", "Processing stopped safely. The recording and completed stages remain saved.").payload())
            except Problem:
                pass
        return True

    def process(self, job_id: str):
        job, recording = self.check(job_id)
        work = self.settings.data_dir / "working" / job_id
        work.mkdir(exist_ok=True)
        try:
            with self.store.tx() as cx:
                revision = self.store.get(cx, job.get("transcript_revision_id", ""), "transcript")
            if not revision or (revision["origin"] == "provider" and not revision.get("_complete")):
                segments = []
                start = 0.0
                while start < recording["duration_seconds"] - 0.01:
                    self.check(job_id)
                    duration = min(self.settings.chunk_seconds, recording["duration_seconds"] - start)
                    cache_id = "stt_" + digest([recording["id"], recording["_sha256"], start, duration, self.settings.scribe_model])
                    cached = self.cached(cache_id)
                    if cached:
                        chunk_segments = cached["payload"]["segments"]
                    else:
                        if not self.providers.configured()["elevenlabs"]:
                            raise Problem("provider_not_configured", "Enter provider keys through the terminal launcher to transcribe.", 409)
                        self.update(job_id, status="preparing_audio", stage="prepare_audio")
                        chunk = work / "chunk.wav"
                        audio_chunk(Path(recording["_audio_path"]), chunk, start, duration)
                        self.check(job_id)
                        self.update(job_id, status="transcribing", stage="transcribe")
                        raw = self.providers.transcribe(chunk, duration, job_id)
                        chunk_segments = normalize_transcript(raw, start, duration)
                        self.checkpoint(job_id, cache_id, {"segments": chunk_segments,
                                                        "provider_text": raw.get("text", ""), "offset_seconds": start})
                        chunk.unlink(missing_ok=True)
                    segments.extend(chunk_segments)
                    start = min(recording["duration_seconds"], start + duration)
                    revision = self.save_transcript(job_id, list(segments), start, start >= recording["duration_seconds"] - 0.01)
            self.update(job_id, status="analysing", stage="classify_subject")
            classification = self.classifier.classify("\n".join(s["text"] for s in revision["segments"]), revision["id"])
            job, _ = self.check(job_id)
            override = job.get("_subject_override")
            subject = override["subject"] if override else classification["label"]
            groups, group, size = [], [], 0
            for segment in revision["segments"]:
                if group and size + len(segment["text"]) > self.settings.generation_chars:
                    groups.append(group)
                    group, size = [], 0
                group.append(segment)
                size += len(segment["text"])
            if group:
                groups.append(group)
            generated, provenance = [], []
            generation_error = None
            for index, group in enumerate(groups):
                self.check(job_id)
                self.update(job_id, status="generating", stage="generate_notes")
                cache_id = "gen_" + digest([revision["id"], index, subject, self.settings.openai_model, PROMPT_VERSION])
                cached = self.cached(cache_id)
                if cached:
                    part = GeneratedPack.model_validate(cached["payload"]["generated"])
                    prov = cached["payload"]["provenance"]
                else:
                    try:
                        part, prov = self.providers.generate(group, subject, job_id)
                        validate_generated(part, group)
                        self.checkpoint(job_id, cache_id, {"generated": part.model_dump(), "provenance": prov})
                    except Problem as error:
                        if not generated or error.code == "deleted":
                            raise
                        generation_error = error
                        break
                generated.append(part)
                provenance.append({**prov, "output_processing_version": OUTPUT_PROCESSING_VERSION})
            if not generated:
                raise Problem("no_usable_speech", "There is no transcript content to process.")
            self.update(job_id, status="validating", stage="validate_outputs")
            candidates = [p.subject for p in generated if p.subject]
            if classification["source"] == "unknown" and candidates:
                label, count = Counter(candidates).most_common(1)[0]
                if count / len(generated) >= 0.6:
                    classification.update(label=label, source="openai_baseline")
            questions, key = assemble_quiz(generated)
            metadata = assemble_metadata(generated, revision["segments"])
            coverage = revision["coverage"]
            warnings = [] if questions else ["insufficient_quiz_evidence"]
            if generation_error:
                completed_segments = [s for group in groups[:len(generated)] for s in group]
                intervals = [[s["start_seconds"], s["end_seconds"]] for s in completed_segments
                             if s["start_seconds"] is not None and s["end_seconds"] is not None]
                coverage = {"source_duration_seconds": recording["duration_seconds"],
                            "covered_intervals": intervals, "covered_segment_ids": [s["id"] for s in completed_segments],
                            "gaps": [[intervals[-1][1] if intervals else 0, recording["duration_seconds"]]],
                            "partial": True}
                warnings.append("generation_incomplete")
            pack = {"schema_version": "1.0", "id": uid("pack"), "recording_id": recording["id"],
                    "transcript_revision_id": revision["id"], "created_at": now(), "output_language": "en",
                    "classification": classification, "subject_override": override, "metadata": metadata,
                    "notes": [n.model_dump() for p in generated for n in p.notes], "questions": questions,
                    "quiz_status": "available" if questions else "insufficient_evidence",
                    "artifact_statuses": {"notes": "ready", "metadata": "ready", "quiz": "ready" if questions else "insufficient_evidence"},
                    "coverage": coverage, "warnings": warnings,
                    "provenance": provenance, "_answer_key": key, "_override_id": override["id"] if override else None}
            with self.store.tx() as cx:
                self.store.recording(cx, recording["id"])
                current_job = self.store.get(cx, job_id, "job")
                if not current_job or current_job["status"] == "canceled":
                    raise Problem("deleted", "Canceled work cannot publish results.", 404)
                self.store.put(cx, "pack", pack, recording["id"])
                current_job.update(status="ready" if questions and not coverage["gaps"] and not generation_error else "partial",
                                   stage="validate_outputs", study_pack_id=pack["id"],
                                   error=generation_error.payload() if generation_error else None, updated_at=now())
                self.store.put(cx, "job", current_job, recording["id"])
        finally:
            shutil.rmtree(work, ignore_errors=True)
