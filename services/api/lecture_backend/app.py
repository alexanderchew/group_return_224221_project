from __future__ import annotations

import asyncio
import hashlib
import importlib.metadata
import json
import math
import os
import secrets
import shutil
import tempfile
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, File, Form, Header, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.exceptions import HTTPException

from .core import Problem, Settings, Store, digest, now, public_recording, uid
from .media import concatenate, file_digest, probe
from .providers import Providers
from .schemas import (ErrorEnvelope, JobOut, JobRequest, OverrideRequest, PatchRecording, QuizSubmission,
                      RecordingOut, RevisionRequest, StudyPackOut, TranscriptOut, UploadManifest)
from .worker import ACTIVE, Worker

Key = Annotated[str, Header(alias="Idempotency-Key", min_length=8, max_length=200)]
security = HTTPBearer(auto_error=False)


def create_app(settings: Settings | None = None, providers: Providers | None = None) -> FastAPI:
    settings = settings or Settings()
    store = Store(settings)
    providers = providers or Providers(settings, store)
    worker = Worker(settings, store, providers)

    @asynccontextmanager
    async def lifespan(app):
        if settings.start_worker:
            worker.start()
        yield
        worker.close()

    app = FastAPI(title="Lecture Companion — Alex's Backend", version="0.1.0", lifespan=lifespan,
                  description="Private shared demo API. Media times use seconds. Provider keys are terminal-only.")
    app.state.store, app.state.settings, app.state.worker = store, settings, worker
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins),
                       allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE", "PUT"],
                       allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "If-Match", "X-CSRF-Token", "X-Part-SHA256"])

    @app.middleware("http")
    async def request_guards(request: Request, call_next):
        request.state.request_id = uid("req")
        limit = settings.max_audio_bytes + 1024 * 1024 if request.url.path == "/api/v1/recordings" else settings.part_bytes + 1024
        if request.url.path != "/api/v1/recordings" and "/parts/" not in request.url.path:
            limit = 1024 * 1024
        try:
            if int(request.headers.get("content-length", "0")) > limit:
                raise Problem("size_limit", "Request exceeds the current byte limit.", 413)
            if request.headers.get("content-encoding", "identity") != "identity":
                raise Problem("unsupported_media", "Compressed request bodies are not supported.", 415)
        except ValueError:
            return JSONResponse({"error": Problem("invalid_request", "Invalid Content-Length.").payload(), "request_id": request.state.request_id}, 422)
        except Problem as error:
            return JSONResponse({"error": error.payload(), "request_id": request.state.request_id}, error.status)
        original_receive = request._receive
        received = 0

        async def bounded_receive():
            nonlocal received
            message = await original_receive()
            received += len(message.get("body", b""))
            if received > limit:
                request.state.body_too_large = True
                raise Problem("size_limit", "Request exceeds the current byte limit.", 413)
            return message

        request._receive = bounded_receive
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(Problem)
    async def problem_handler(request, error):
        return JSONResponse({"error": error.payload(), "request_id": getattr(request.state, "request_id", uid("req"))}, error.status)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request, error):
        return JSONResponse({"error": Problem("invalid_request", "Request fields do not match the API schema.").payload(),
                             "request_id": request.state.request_id}, 422)

    @app.exception_handler(HTTPException)
    async def http_error_handler(request, error):
        if getattr(request.state, "body_too_large", False):
            return JSONResponse({"error": Problem("size_limit", "Request exceeds the current byte limit.", 413).payload(),
                                 "request_id": request.state.request_id}, 413)
        problem = Problem("not_found" if error.status_code == 404 else "http_error", "Resource not found." if error.status_code == 404 else "The HTTP request could not be completed.", error.status_code)
        return JSONResponse({"error": problem.payload(), "request_id": getattr(request.state, "request_id", uid("req"))}, error.status_code)

    def authorize(request: Request, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]):
        token = credentials.credentials if credentials else request.cookies.get("lecture_demo", "")
        if not secrets.compare_digest(token, store.token()):
            raise Problem("access_required", "Demo connection access is required.", 401)
        if not credentials and request.method not in {"GET", "HEAD", "OPTIONS"}:
            csrf = request.headers.get("X-CSRF-Token", "")
            if not csrf or not secrets.compare_digest(csrf, request.cookies.get("lecture_csrf", "")):
                raise Problem("csrf_required", "A matching CSRF token is required for cookie-authenticated changes.", 403)

    router = APIRouter(prefix="/api/v1", dependencies=[Depends(authorize)],
                       responses={code: {"model": ErrorEnvelope} for code in
                                  (400, 401, 403, 404, 409, 410, 413, 415, 422, 429, 503)})

    def perform(route: str, key: str, payload, action, recording_id: str | None = None):
        # One transaction includes both the effect and its cached outcome. Worker never performs paid calls here.
        with store.operation_lock, store.tx() as cx:
            if recording_id:
                store.recording(cx, recording_id)
            hashed = digest(payload)
            previous = store.replay(cx, route, key, hashed)
            if previous:
                return JSONResponse(previous[0], previous[1])
            result, status, linked_id = action(cx)
            store.remember(cx, route, key, hashed, result, status, linked_id)
            return JSONResponse(result, status)

    def ensure_upload_live(value):
        if value and value["state"] != "completed" and datetime.fromisoformat(value["expires_at"]) <= datetime.now(UTC):
            raise Problem("upload_expired", "This incomplete upload expired; create a new upload manifest.", 410)

    def get_live_object(cx, object_id: str, kind: str):
        value = store.get(cx, object_id, kind)
        if not value:
            raise Problem("not_found", "Resource not found.", 404)
        store.recording(cx, value["recording_id"])
        return value

    def require_revision(recording: dict, value: str | None):
        if value is None or value.strip('"') != str(recording["revision"]):
            raise Problem("revision_conflict", "Refresh the recording and supply its current revision in If-Match.", 409)

    def public_job(job: dict):
        return {k: v for k, v in job.items() if not k.startswith("_")}

    def public_pack(cx, pack: dict):
        recording = store.recording(cx, pack["recording_id"])
        revision = store.get(cx, pack["transcript_revision_id"], "transcript")
        result = {k: v for k, v in pack.items() if not k.startswith("_")}
        result.update(transcript_segments=revision["segments"][:100],
                      transcript_next_cursor="100" if len(revision["segments"]) > 100 else None,
                      freshness="current" if recording["current_transcript_revision_id"] == pack["transcript_revision_id"]
                      and recording.get("subject_override_id") == pack.get("_override_id") else "outdated")
        return result

    def register(cx, path: Path, info: dict, source: str, title: str, recorded_at: str | None, completing_upload_id: str | None = None):
        existing = sum(p.stat().st_size for p in (settings.data_dir / "audio").rglob("*") if p.is_file())
        pending_bytes = sum(sum(f["byte_size"] for f in u["files"]) for u in store.list(cx, "upload")
                            if u["state"] != "completed" and u["id"] != completing_upload_id)
        if existing + pending_bytes + info["byte_size"] > settings.storage_limit_bytes:
            raise Problem("storage_limit", "The demo's stored-audio quota is full.", 409)
        recording_id = uid("rec")
        directory = settings.data_dir / "audio" / recording_id
        directory.mkdir(mode=0o700)
        destination = directory / "original.bin"
        shutil.move(str(path), destination)
        os.chmod(destination, 0o600)
        recording = {"id": recording_id, "title": title, "source": source, "recorded_at": recorded_at,
                     "created_at": now(), "duration_seconds": info["duration_seconds"],
                     "byte_size": info["byte_size"], "mime_type": info["mime_type"],
                     "latest_job_id": None, "current_transcript_revision_id": None,
                     "revision": 1, "deleted_at": None, "declared_metadata": {},
                     "_audio_path": str(destination), "_sha256": info["sha256"]}
        store.put(cx, "recording", recording)
        return recording

    @app.get("/health", tags=["operator"])
    def health():
        return {"status": "ok", "service": "lecture-companion-backend", "version": "0.1.0"}

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/docs")

    @app.get("/operator/connect", response_class=HTMLResponse, include_in_schema=False)
    def connect_form():
        return """<!doctype html><html><head><title>Connect to the local demo API</title></head>
        <body><h1>Connect this browser</h1><p>Enter the demo connection code shown by the laptop launcher.
        This is not an ElevenLabs or OpenAI key. All authorized devices share the demo library.</p>
        <form method="post"><label>Demo connection code <input name="access_token" type="password" autocomplete="off" required></label>
        <button>Connect</button></form></body></html>"""

    @app.post("/operator/connect", include_in_schema=False)
    def connect_browser(request: Request, access_token: Annotated[str, Form()]):
        origin = request.headers.get("origin")
        if origin and origin not in {*settings.allowed_origins, str(request.base_url).rstrip("/")}:
            raise Problem("access_required", "This origin cannot provision browser access.", 403)
        if not secrets.compare_digest(access_token, store.token()):
            raise Problem("access_required", "Invalid demo connection code.", 401)
        response = RedirectResponse("/docs", 303)
        response.set_cookie("lecture_demo", access_token, httponly=True, secure=request.url.scheme == "https", samesite="strict")
        response.set_cookie("lecture_csrf", secrets.token_urlsafe(24), httponly=False,
                            secure=request.url.scheme == "https", samesite="strict")
        return response

    @router.get("/config", tags=["configuration"])
    def config():
        return {"api_version": "v1", "build_version": "0.1.0", "workspace_mode": "shared_demo",
                "max_audio_bytes": settings.max_audio_bytes, "max_duration_seconds": settings.max_duration_seconds,
                "target_max_audio_bytes": settings.target_max_audio_bytes,
                "target_max_duration_seconds": settings.target_max_duration_seconds,
                "capacity_status": "prototype_limited", "accepted_mime_types": ["audio/wav", "audio/mpeg", "audio/mp4", "audio/webm"],
                "output_languages": ["en"], "default_output_language": "en", "media_time_unit": "seconds",
                "provider_configured": providers.configured(), "classifier_modes": ["custom_model", "openai_baseline", "unknown"],
                "enabled_features": ["recordings", "persistent_jobs", "resumable_upload", "transcript_revisions", "subject_overrides", "quiz_attempts", "source_playback", "budget_control"],
                "dependency_versions": {p: importlib.metadata.version(p) for p in ["fastapi", "uvicorn", "openai", "pydantic", "httpx"]}}

    @router.get("/budget", tags=["configuration"])
    def budget():
        return store.budget()

    @router.post("/recordings", status_code=201, response_model=RecordingOut, tags=["recordings"])
    async def upload_recording(file: Annotated[UploadFile, File()], source: Annotated[Literal["mobile", "web"], Form()],
                               key: Key, title: Annotated[str, Form(max_length=200)] = "Imported lecture",
                               recorded_at: Annotated[datetime | None, Form()] = None):
        if recorded_at is not None and recorded_at.tzinfo is None:
            raise Problem("invalid_request", "recorded_at must include a timezone.")
        timestamp = recorded_at.astimezone(UTC).isoformat() if recorded_at else None
        fd, name = tempfile.mkstemp(dir=settings.data_dir / "working", prefix="intake-")
        path = Path(name)
        try:
            size = 0
            with os.fdopen(fd, "wb") as stream:
                while block := await file.read(1024 * 1024):
                    size += len(block)
                    if size > settings.max_audio_bytes:
                        raise Problem("size_limit", "Audio exceeds the current byte limit.", 413)
                    stream.write(block)
            info = await asyncio.to_thread(probe, path, settings)

            def action(cx):
                result = register(cx, path, info, source, title, timestamp)
                return public_recording(result), 201, result["id"]

            return perform("POST /recordings", key, [info["sha256"], source, title, timestamp], action)
        finally:
            path.unlink(missing_ok=True)
            await file.close()

    @router.get("/recordings", tags=["recordings"])
    def recordings(cursor: str | None = None, limit: int = Query(20, ge=1, le=100), search: str = ""):
        with store.tx() as cx:
            rows = [r for r in store.list(cx, "recording") if not r.get("deleted_at") and search.casefold() in r["title"].casefold()]
        if cursor:
            index = next((i for i, row in enumerate(rows) if row["id"] == cursor), None)
            if index is None:
                raise Problem("invalid_cursor", "Unknown recording cursor.")
            rows = rows[index + 1:]
        selected = rows[:limit]
        return {"items": [public_recording(r) for r in selected], "next_cursor": selected[-1]["id"] if len(rows) > limit else None}

    @router.get("/recordings/{recording_id}", response_model=RecordingOut, tags=["recordings"])
    def recording(recording_id: str, response: Response):
        with store.tx() as cx:
            result = store.recording(cx, recording_id)
        response.headers["ETag"] = f'"{result["revision"]}"'
        return public_recording(result)

    @router.patch("/recordings/{recording_id}", response_model=RecordingOut, tags=["recordings"])
    def patch(recording_id: str, body: PatchRecording, if_match: Annotated[str | None, Header()] = None):
        with store.tx() as cx:
            result = store.recording(cx, recording_id)
            require_revision(result, if_match)
            result.update(body.model_dump(exclude_none=True))
            result["revision"] += 1
            store.put(cx, "recording", result)
        return public_recording(result)

    @router.delete("/recordings/{recording_id}", status_code=204, tags=["recordings"])
    def delete(recording_id: str):
        directory = None
        with store.tx() as cx:
            result = store.get(cx, recording_id, "recording")
            if result and not result.get("deleted_at"):
                candidate = Path(result["_audio_path"]).parent.resolve()
                if candidate.is_relative_to(settings.data_dir / "audio"):
                    directory = candidate
                cx.execute("DELETE FROM objects WHERE recording_id=?", (recording_id,))
                tombstone = {"error": Problem("deleted", "This operation refers to deleted study data.", 410).payload(), "request_id": uid("req")}
                cx.execute("UPDATE idempotency SET response=?,status=410 WHERE recording_id=?",
                           (json.dumps(tombstone), recording_id))
                store.put(cx, "recording", {"id": recording_id, "deleted_at": now(), "created_at": result["created_at"]})
        if directory is not None:
            shutil.rmtree(directory, ignore_errors=True)
        return Response(status_code=204)

    @router.post("/recordings/{recording_id}/jobs", status_code=202, response_model=JobOut, tags=["jobs"])
    def start_job(recording_id: str, body: JobRequest, key: Key):
        def action(cx):
            rec = store.recording(cx, recording_id)
            revision_id = body.transcript_revision_id or rec["current_transcript_revision_id"]
            if revision_id:
                revision = get_live_object(cx, revision_id, "transcript")
                if revision["recording_id"] != recording_id:
                    raise Problem("revision_conflict", "This transcript belongs to a different recording.", 409)
            jobs = store.list(cx, "job", recording_id)
            active = [j for j in jobs if j["status"] in ACTIVE | {"queued"}]
            if active:
                if active[0].get("transcript_revision_id") != revision_id or body.regenerate:
                    raise Problem("job_active", "Another input is already processing for this recording.", 409)
                return public_job(active[0]), 202, recording_id
            if body.retry_of_job_id:
                parent = get_live_object(cx, body.retry_of_job_id, "job")
                if parent["recording_id"] != recording_id or parent["status"] not in {"failed", "blocked", "partial"}:
                    raise Problem("revision_conflict", "This job is not an eligible retry.", 409)
            elif not body.regenerate:
                ready = next((j for j in jobs if j["status"] == "ready" and j.get("transcript_revision_id") == revision_id), None)
                if ready:
                    pack = store.get(cx, ready["study_pack_id"], "pack")
                    if public_pack(cx, pack)["freshness"] == "current":
                        return public_job(ready), 202, recording_id
            override = store.get(cx, rec.get("subject_override_id", ""), "override")
            result = {"id": uid("job"), "recording_id": recording_id, "transcript_revision_id": revision_id,
                      "retry_of_job_id": body.retry_of_job_id, "status": "queued", "stage": None,
                      "created_at": now(), "updated_at": now(), "study_pack_id": None, "error": None,
                      "stage_attempts": [], "_subject_override": override}
            store.put(cx, "job", result, recording_id)
            rec["latest_job_id"] = result["id"]
            store.put(cx, "recording", rec)
            return public_job(result), 202, recording_id
        return perform(f"POST /recordings/{recording_id}/jobs", key, body.model_dump(), action, recording_id)

    @router.get("/jobs/{job_id}", response_model=JobOut, tags=["jobs"])
    def job(job_id: str):
        with store.tx() as cx:
            return public_job(get_live_object(cx, job_id, "job"))

    @router.post("/jobs/{job_id}/cancel", response_model=JobOut, tags=["jobs"])
    def cancel(job_id: str):
        with store.tx() as cx:
            value = get_live_object(cx, job_id, "job")
            if value["status"] in ACTIVE | {"queued", "blocked"}:
                value.update(status="canceled", updated_at=now())
                store.put(cx, "job", value, value["recording_id"])
            return public_job(value)

    @router.get("/recordings/{recording_id}/study-pack", response_model=StudyPackOut, tags=["study"])
    def latest_pack(recording_id: str):
        with store.tx() as cx:
            store.recording(cx, recording_id)
            values = store.list(cx, "pack", recording_id)
            if not values:
                raise Problem("not_ready", "A study pack is not available yet.", 409)
            return public_pack(cx, values[0])

    @router.get("/study-packs/{study_pack_id}", response_model=StudyPackOut, tags=["study"])
    def study_pack(study_pack_id: str):
        with store.tx() as cx:
            return public_pack(cx, get_live_object(cx, study_pack_id, "pack"))

    @router.get("/recordings/{recording_id}/transcripts/{revision_id}", response_model=TranscriptOut, tags=["study"])
    def transcript(recording_id: str, revision_id: str, cursor: int = Query(0, ge=0),
                   limit: int = Query(100, ge=1, le=500), segment_ids: str | None = None):
        with store.tx() as cx:
            value = get_live_object(cx, revision_id, "transcript")
            if value["recording_id"] != recording_id:
                raise Problem("not_found", "Transcript not found.", 404)
        result = {k: v for k, v in value.items() if not k.startswith("_")}
        if segment_ids:
            wanted = set(segment_ids.split(","))
            result["segments"] = [s for s in value["segments"] if s["id"] in wanted]
            if {s["id"] for s in result["segments"]} != wanted:
                raise Problem("not_found", "A referenced transcript segment is missing.", 404)
            result["next_cursor"] = None
        else:
            result["segments"] = value["segments"][cursor:cursor + limit]
            result["next_cursor"] = str(cursor + limit) if len(value["segments"]) > cursor + limit else None
        return result

    @router.post("/recordings/{recording_id}/transcript-revisions", status_code=201, tags=["study"])
    def revise(recording_id: str, body: RevisionRequest, key: Key):
        def action(cx):
            rec = store.recording(cx, recording_id)
            if rec["current_transcript_revision_id"] != body.base_revision_id:
                raise Problem("revision_conflict", "The transcript changed. Refresh before saving edits.", 409)
            parent = get_live_object(cx, body.base_revision_id, "transcript")
            edits = {e.segment_id: e.text for e in body.edits}
            if len(edits) != len(body.edits) or not set(edits) <= {s["id"] for s in parent["segments"]}:
                raise Problem("invalid_request", "Edits contain duplicate or unknown segments.")
            result = {**parent, "id": uid("transcript"), "parent_revision_id": parent["id"],
                      "origin": "user-corrected", "created_at": now(),
                      "segments": [{**s, "text": edits.get(s["id"], s["text"])} for s in parent["segments"]]}
            store.put(cx, "transcript", result, recording_id)
            rec["current_transcript_revision_id"] = result["id"]
            rec["revision"] += 1
            store.put(cx, "recording", rec)
            return {"id": result["id"], "parent_revision_id": parent["id"], "created_at": result["created_at"]}, 201, recording_id
        return perform(f"POST /recordings/{recording_id}/transcript-revisions", key, body.model_dump(), action, recording_id)

    @router.post("/recordings/{recording_id}/subject-overrides", status_code=201, tags=["study"])
    def override(recording_id: str, body: OverrideRequest, key: Key):
        def action(cx):
            rec = store.recording(cx, recording_id)
            if body.transcript_revision_id != rec["current_transcript_revision_id"]:
                raise Problem("revision_conflict", "Select the current transcript revision.", 409)
            result = {"id": uid("override"), "recording_id": recording_id, "created_at": now(), **body.model_dump()}
            store.put(cx, "override", result, recording_id)
            rec["subject_override_id"] = result["id"]
            rec["revision"] += 1
            store.put(cx, "recording", rec)
            return result, 201, recording_id
        return perform(f"POST /recordings/{recording_id}/subject-overrides", key, body.model_dump(), action, recording_id)

    @router.post("/recordings/{recording_id}/quiz-attempts", status_code=201, tags=["quiz"])
    def submit(recording_id: str, body: QuizSubmission, key: Key):
        def action(cx):
            pack = get_live_object(cx, body.study_pack_id, "pack")
            if pack["recording_id"] != recording_id:
                raise Problem("revision_conflict", "This study pack belongs to another recording.", 409)
            if public_pack(cx, pack)["freshness"] != "current":
                raise Problem("study_pack_outdated", "Regenerate from the current transcript before a new submission.", 409)
            if pack["quiz_status"] != "available" or not pack["questions"]:
                raise Problem("quiz_unavailable", "There are no supported questions to score.", 409)
            answers = {a.question_id: a.option_id for a in body.answers}
            if len(answers) != len(body.answers) or set(answers) != {q["id"] for q in pack["questions"]}:
                raise Problem("invalid_answers", "Submit every question exactly once.")
            results = []
            for q in pack["questions"]:
                selected = answers[q["id"]]
                if selected is not None and selected not in {o["id"] for o in q["options"]}:
                    raise Problem("invalid_answers", "An option does not belong to this question.")
                answer_key = pack["_answer_key"][q["id"]]
                results.append({"question_id": q["id"], "selected_option_id": selected,
                                "is_correct": selected == answer_key["correct_option_id"], **answer_key})
            revealed = bool(store.get(cx, "revealed_" + pack["id"], "reveal"))
            correct = sum(r["is_correct"] for r in results)
            result = {"id": uid("attempt"), "recording_id": recording_id, "study_pack_id": pack["id"],
                      "created_at": now(), "submitted_at": now(), "correct_count": correct,
                      "total_count": len(results), "unanswered_count": sum(r["selected_option_id"] is None for r in results),
                      "percentage": round(100 * correct / len(results), 1), "practice_revealed": revealed, "results": results}
            store.put(cx, "attempt", result, recording_id)
            store.put(cx, "reveal", {"id": "revealed_" + pack["id"], "recording_id": recording_id, "created_at": now()}, recording_id)
            return result, 201, recording_id
        return perform(f"POST /recordings/{recording_id}/quiz-attempts", key, body.model_dump(), action, recording_id)

    @router.get("/quiz-attempts/{attempt_id}", tags=["quiz"])
    def attempt(attempt_id: str):
        with store.tx() as cx:
            return get_live_object(cx, attempt_id, "attempt")

    @router.post("/study-packs/{study_pack_id}/quiz-solutions", tags=["quiz"])
    def reveal(study_pack_id: str, key: Key):
        with store.tx() as cx:
            pack = get_live_object(cx, study_pack_id, "pack")
        def action(cx):
            current = get_live_object(cx, study_pack_id, "pack")
            store.put(cx, "reveal", {"id": "revealed_" + study_pack_id, "recording_id": pack["recording_id"], "created_at": now()}, pack["recording_id"])
            return {"study_pack_id": study_pack_id, "practice_revealed": True, "solutions": current["_answer_key"]}, 200, pack["recording_id"]
        return perform(f"POST /study-packs/{study_pack_id}/quiz-solutions", key, {}, action, pack["recording_id"])

    @router.get("/recordings/{recording_id}/audio", tags=["recordings"], response_class=FileResponse,
                responses={code: {"content": {mime: {"schema": {"type": "string", "format": "binary"}}
                           for mime in ("audio/wav", "audio/mpeg", "audio/mp4", "audio/webm")}}
                           for code in (200, 206)})
    def audio(recording_id: str):
        with store.tx() as cx:
            rec = store.recording(cx, recording_id)
        if not Path(rec["_audio_path"]).exists():
            raise Problem("not_found", "Source audio is unavailable.", 404)
        return FileResponse(rec["_audio_path"], media_type=rec["mime_type"], content_disposition_type="inline")

    @router.post("/uploads", status_code=201, tags=["uploads"])
    def create_upload(body: UploadManifest, key: Key):
        if len({f.id for f in body.files}) != len(body.files) or len({f.sequence for f in body.files}) != len(body.files):
            raise Problem("invalid_request", "Upload files need unique IDs and sequence numbers.")
        if sum(f.byte_size for f in body.files) > settings.max_audio_bytes:
            raise Problem("size_limit", "Capture manifest exceeds the current byte limit.", 413)
        if any(f.capture_gap_seconds != 0 for f in body.files):
            raise Problem("feature_unavailable", "Explicit interruption gaps require source-time mapping support; keep paused intervals out of the audio timeline.", 409)
        def action(cx):
            pending = [u for u in store.list(cx, "upload") if u["state"] != "completed"]
            reserved_bytes = sum(sum(f["byte_size"] for f in u["files"]) for u in pending)
            stored_bytes = sum(p.stat().st_size for p in (settings.data_dir / "audio").rglob("*") if p.is_file())
            if len(pending) >= 32 or reserved_bytes + stored_bytes + sum(f.byte_size for f in body.files) > settings.storage_limit_bytes:
                raise Problem("storage_limit", "The demo cannot reserve space for another upload.", 409)
            result = {"id": uid("upload"), "created_at": now(), "state": "incomplete", "recording_id": None,
                      "part_size_bytes": settings.part_bytes, "expires_at": (datetime.now(UTC) + timedelta(hours=24)).isoformat(),
                      "files": [], **body.model_dump(exclude={"files"})}
            for f in body.files:
                result["files"].append({**f.model_dump(), "received_parts": {}, "part_count": math.ceil(f.byte_size / settings.part_bytes)})
            store.put(cx, "upload", result)
            return result, 201, None
        return perform("POST /uploads", key, body.model_dump(), action)

    @router.get("/uploads/{upload_id}", tags=["uploads"])
    def upload_status(upload_id: str):
        with store.tx() as cx:
            result = store.get(cx, upload_id, "upload")
            if not result:
                raise Problem("not_found", "Upload not found.", 404)
            ensure_upload_live(result)
            return result

    @router.put("/uploads/{upload_id}/files/{file_id}/parts/{part_index}", tags=["uploads"])
    async def upload_part(upload_id: str, file_id: str, part_index: int, request: Request,
                          x_part_sha256: Annotated[str, Header(pattern=r"^[a-f0-9]{64}$")]):
        raw = await request.body()
        if len(raw) > settings.part_bytes:
            raise Problem("size_limit", "Transport part is too large.", 413)
        if hashlib.sha256(raw).hexdigest() != x_part_sha256:
            raise Problem("checksum_mismatch", "Transport part checksum did not match.")
        with store.operation_lock, store.tx() as cx:
            value = store.get(cx, upload_id, "upload")
            if not value:
                raise Problem("not_found", "Upload not found.", 404)
            ensure_upload_live(value)
            spec = next((f for f in value["files"] if f["id"] == file_id), None)
            if not spec or part_index < 0 or part_index >= spec["part_count"]:
                raise Problem("invalid_request", "Unknown file or transport part.")
            expected = min(settings.part_bytes, spec["byte_size"] - part_index * settings.part_bytes)
            if len(raw) != expected:
                raise Problem("upload_incomplete", "Transport part length does not match the manifest.")
            old = spec["received_parts"].get(str(part_index))
            if old and old != x_part_sha256:
                raise Problem("checksum_mismatch", "This part already has different content.", 409)
            if value["state"] == "completed":
                if old == x_part_sha256:
                    return {"received": True, "sha256": old}
                raise Problem("revision_conflict", "This upload is already completed.", 409)
            directory = settings.data_dir / "uploads" / upload_id / file_id
            directory.mkdir(parents=True, exist_ok=True)
            target = directory / str(part_index)
            temporary = directory / (str(part_index) + ".tmp")
            temporary.write_bytes(raw)
            temporary.replace(target)
            spec["received_parts"][str(part_index)] = x_part_sha256
            store.put(cx, "upload", value)
        return {"received": True, "sha256": x_part_sha256}

    @router.post("/uploads/{upload_id}/complete", status_code=201, response_model=RecordingOut, tags=["uploads"])
    def complete_upload(upload_id: str, key: Key):
        def action(cx):
            value = store.get(cx, upload_id, "upload")
            if not value:
                raise Problem("not_found", "Upload not found.", 404)
            ensure_upload_live(value)
            if value["recording_id"]:
                return public_recording(store.recording(cx, value["recording_id"])), 201, value["recording_id"]
            directory = settings.data_dir / "uploads" / upload_id
            assembled = []
            for spec in sorted(value["files"], key=lambda f: f["sequence"]):
                if len(spec["received_parts"]) != spec["part_count"]:
                    raise Problem("upload_incomplete", "Some transport parts are missing.", 409)
                target = directory / (spec["id"] + ".assembled")
                with target.open("wb") as output:
                    for index in range(spec["part_count"]):
                        part = directory / spec["id"] / str(index)
                        if not part.exists() or file_digest(part) != spec["received_parts"][str(index)]:
                            raise Problem("checksum_mismatch", "A stored transport part failed verification.")
                        with part.open("rb") as stream:
                            shutil.copyfileobj(stream, output, 1024 * 1024)
                if file_digest(target) != spec["sha256"]:
                    raise Problem("checksum_mismatch", "The assembled file digest does not match.")
                probe(target, settings)
                assembled.append(target)
            if len(assembled) == 1:
                original = assembled[0]
            else:
                original = directory / "reconstructed.wav"
                concatenate(assembled, original)
            info = probe(original, settings)
            result = register(cx, original, info, value["source"], value["title"], value["recorded_at"], upload_id)
            value.update(recording_id=result["id"], state="completed")
            if len(assembled) > 1:
                originals = Path(result["_audio_path"]).parent / "source-files"
                originals.mkdir(mode=0o700)
                result["_source_assets"] = []
                for index, source_file in enumerate(assembled):
                    retained = originals / f"{index}.bin"
                    shutil.copyfile(source_file, retained)
                    result["_source_assets"].append({"path": str(retained), "sha256": file_digest(retained)})
                store.put(cx, "recording", result)
            store.put(cx, "upload", value, result["id"])
            for cached in cx.execute("SELECT route,key,response FROM idempotency WHERE route='POST /uploads'").fetchall():
                if json.loads(cached["response"]).get("id") == upload_id:
                    cx.execute("UPDATE idempotency SET recording_id=? WHERE route=? AND key=?",
                               (result["id"], cached["route"], cached["key"]))
            # Remove original transport copies after registration; checksums remain for idempotent resume.
            shutil.rmtree(directory, ignore_errors=True)
            return public_recording(result), 201, result["id"]
        # Upload tombstone check is inside the action; delete also purges the corresponding upload/cached responses.
        return perform(f"POST /uploads/{upload_id}/complete", key, {}, action)

    app.include_router(router)
    return app
