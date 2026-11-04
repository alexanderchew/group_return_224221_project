from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class EvidenceItem(StrictModel):
    text: str = Field(min_length=1, max_length=12000)
    evidence_segment_ids: list[str] = Field(min_length=1, max_length=50)


class NoteSection(StrictModel):
    heading: str = Field(min_length=1, max_length=200)
    points: list[EvidenceItem] = Field(min_length=1, max_length=40)


class Metadata(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=12000)
    evidence_segment_ids: list[str] = Field(min_length=1, max_length=50)
    topics: list[EvidenceItem] = Field(min_length=1, max_length=30)


class Option(StrictModel):
    id: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=2000)


class GeneratedQuestion(StrictModel):
    prompt: str = Field(min_length=1, max_length=4000)
    options: list[Option] = Field(min_length=4, max_length=4)
    correct_option_id: str
    explanation: str = Field(min_length=1, max_length=4000)
    evidence_segment_ids: list[str] = Field(min_length=1, max_length=50)


class GeneratedPack(StrictModel):
    subject: str | None
    metadata: Metadata
    notes: list[NoteSection] = Field(min_length=1, max_length=30)
    questions: list[GeneratedQuestion] = Field(max_length=5)


class JobRequest(StrictModel):
    retry_of_job_id: str | None = None
    transcript_revision_id: str | None = None
    regenerate: bool = False


class PatchRecording(StrictModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    declared_metadata: dict | None = None


class SegmentEdit(StrictModel):
    segment_id: str
    text: str = Field(min_length=1, max_length=12000)


class RevisionRequest(StrictModel):
    base_revision_id: str
    edits: list[SegmentEdit] = Field(min_length=1, max_length=1000)


class OverrideRequest(StrictModel):
    transcript_revision_id: str
    subject: str = Field(min_length=1, max_length=100)
    reason: str = Field(default="", max_length=1000)


class Answer(StrictModel):
    question_id: str
    option_id: str | None


class QuizSubmission(StrictModel):
    study_pack_id: str
    answers: list[Answer] = Field(min_length=1, max_length=5)


class UploadFileSpec(StrictModel):
    id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,80}$")
    mime_type: str
    byte_size: int = Field(gt=0)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    sequence: int = Field(ge=0)
    source_start_seconds: float = Field(default=0, ge=0)
    capture_gap_seconds: float = Field(default=0, ge=0)


class UploadManifest(StrictModel):
    source: Literal["mobile", "web"]
    title: str = Field(default="Imported lecture", min_length=1, max_length=200)
    recorded_at: str | None = None
    files: list[UploadFileSpec] = Field(min_length=1, max_length=120)


class RecordingOut(BaseModel):
    id: str
    title: str
    source: Literal["mobile", "web"]
    recorded_at: str | None
    created_at: str
    duration_seconds: float
    byte_size: int
    mime_type: str
    latest_job_id: str | None
    current_transcript_revision_id: str | None
    revision: int
    deleted_at: str | None
    declared_metadata: dict


class JobOut(BaseModel):
    id: str
    recording_id: str
    transcript_revision_id: str | None
    retry_of_job_id: str | None
    status: Literal["queued", "preparing_audio", "transcribing", "analysing", "generating", "validating", "ready", "partial", "blocked", "failed", "canceled"]
    stage: str | None
    updated_at: str
    created_at: str
    study_pack_id: str | None
    error: dict | None
    stage_attempts: list[dict]


class TranscriptOut(BaseModel):
    id: str
    recording_id: str
    parent_revision_id: str | None
    origin: str
    created_at: str
    provider: str | None = None
    model: str | None = None
    segments: list[dict]
    coverage: dict
    next_cursor: str | None


class StudyPackOut(BaseModel):
    schema_version: str
    id: str
    recording_id: str
    transcript_revision_id: str
    created_at: str
    output_language: str
    transcript_segments: list[dict]
    transcript_next_cursor: str | None
    classification: dict
    subject_override: dict | None
    metadata: dict
    notes: list[NoteSection]
    quiz_status: Literal["available", "insufficient_evidence", "failed", "unavailable"]
    questions: list[dict]
    artifact_statuses: dict
    coverage: dict
    freshness: Literal["current", "outdated"]
    warnings: list[str]
    provenance: list[dict]


class ErrorPayload(BaseModel):
    code: str
    message: str
    retryable: bool
    stage: str | None


class ErrorEnvelope(BaseModel):
    error: ErrorPayload
    request_id: str
