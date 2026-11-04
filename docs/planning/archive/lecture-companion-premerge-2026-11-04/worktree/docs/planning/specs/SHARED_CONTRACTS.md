# Shared data and API contracts

Version 0.2 · Proposed contract, not generated code. Applies to Ben's frontend, Alex's backend and the model adapter. [Scope/defaults](../SCOPE_BASELINE.md) and [project behavior](../../PROJECT_SPEC.md) remain authoritative. Freeze an adopted schema before independent implementation; a future machine-readable OpenAPI/JSON Schema should be generated from one typed backend contract rather than maintained separately by each client.

## 1. Global conventions

- API prefix `/api/v1`; JSON uses `snake_case`, opaque IDs and explicit nulls for unavailable optional fields. Integers for duration/source time in milliseconds; UTC ISO-8601 event times. UI text is not an enum key.
- Authenticate every workspace resource. Browser: secure HttpOnly session cookie plus CSRF protection for mutations; native: revocable bearer capability in OS secure storage. Capabilities are secrets, distinct from session IDs, and omitted from URLs/logs.
- Create workspaces only through the configured private-demo provisioning path until a public anonymous-access policy is adopted. “No login” is a user flow, not public unlimited provisioning.
- Provider credentials are entered on Alex’s laptop through the terminal launcher and never accepted by client-facing routes. `/capabilities` may expose provider-configured booleans only, never secret values or fingerprints. Native clients reach the laptop via configured LAN/hotspot address.
- Every mutation that can create a billable/logical operation requires an `Idempotency-Key`, scoped to workspace+route+body hash. Same key/body returns the same operation; same key/different body returns conflict. Retention of keys must cover the supported retry horizon.
- List routes are cursor-paginated. Object edits carry expected revision/ETag; conflicts do not overwrite a newer edit. Large byte streams are separate from JSON. All server limits are returned by a capabilities endpoint for client preflight, then rechecked server-side.
- Immutable transcript/artifact/model/quiz revisions are referenced by ID. IDs alone authorize nothing. Ownership is derived from server authentication rather than a client-supplied `workspace_id`.
- An API version change is distinct from a transcript revision, model label version or prompt version. Incompatible enums/fields/labels require migration or an explicit compatibility error.

## 2. Core objects

| Object | Essential fields / invariants |
| --- | --- |
| Workspace | `id`, `created_at`, access/expiry policy, storage/usage limits; no public list of workspaces |
| Session | `id`, `schema_version`, `title`, `source_kind`, `created_at`, `recorded_at`, `duration_ms`, `capture_state`, `transfer_state`, `processing_state`, `current_transcript_revision_id`, `declared_metadata`, `expires_at`, `deleted_at` |
| AudioAsset | `id`, `session_id`, `kind` original/derived, `mime_type`, byte count, digest, verified duration/sample metadata, private storage handle; no stable public filesystem path |
| CaptureInterval | ordered local files/fragments, sequence, source offset, wall start/end, pause/interruption/gap, digest and finalization state; a partial file is not silently called complete |
| Upload | `id`, `session_id`, declared/verified bytes, part size/count, received part digests, state, expiry and completion digest |
| MediaTransform | source/derived asset IDs, operation/version/options, source-to-derived span map; transforms never overwrite original media |
| PipelineJob | `id`, input asset/revision, requested stages, config hash, `status`, per-stage state/attempt, provider correlation IDs, cancellation/tombstone flags, safe error and usage summary |
| TranscriptRevision | `id`, parent revision, source asset, provider/model/config, immutable segments, coverage/gaps, `origin` provider/user-corrected, creator and timestamp |
| TranscriptSegment | `id`, `start_ms`, `end_ms`, `text`, optional anonymous speaker label, chunk/owned-interval provenance; timings always original audio coordinates |
| SubjectPrediction | `id`, input transcript revision, mode/status, model/data/labels/preprocessing versions, per-class scores, proposed label, threshold and abstention reason |
| SubjectOverride | user-selected subject, author/time/reason and linked prediction; does not mutate predicted label |
| StudyArtifact | `id`, `kind`, transcript/coverage/generation run, schema/prompt/provider/model/config versions, validated content/source refs, state, created time |
| QuizSet | immutable ID/version, input revision/coverage, public question objects, server-only key/explanations, generation provenance and publication validation |
| QuizAttempt | `id`, quiz set/version, selected option IDs, submitted time, frozen score/key provenance, revealed/practice flag; no overwriting submitted attempts |
| UsageEvent | workspace/session/job/provider/stage, estimated/actual units, pricing version and correlation; avoid content/secrets. Content-free accounting survives study-session deletion. |
| DemoBudget / Reservation | Global allowance `20.00` USD, settled/reserved/uncertain amounts, conservative request bound, proposed contingency `2.00`, remaining admission capacity, provider/job/request correlation and status. Persist on the laptop independent of workspace/session lifecycle; exact decimal strings or integer monetary subunits, never binary float accounting. |

`declared_metadata` includes optional board, qualification, subject hint, syllabus code, exam year, tier and requested output language. Null means unknown. User-declared subject is not part of the classifier's predictive input or hidden evaluation labels.

Example subject result when the model is disconnected:

```json
{
  "id": "prediction_example",
  "transcript_revision_id": "transcript_revision_example",
  "status": "unavailable",
  "mode": "not_connected",
  "predicted_subject_id": null,
  "scores": null,
  "model_version": null,
  "abstention_reason": null
}
```

A working model's `scores` are model outputs; call them calibrated probabilities only if calibration was actually evaluated. `abstained`, `unavailable`, `failed`, `succeeded` and `bypassed` are different statuses. Manual subject selection is a separate object, never `mode=trained_model`.

## 3. Evidence and study outputs

Every source reference includes `transcript_revision_id`, one or more `segment_ids`, and optional exact quote/character spans. Original-audio times are resolved from validated segments and transform maps. A nonexistent segment, out-of-range span or mismatched quote fails validation. A valid reference establishes location; human review must still establish that it supports the claim.

Proposed bundle schema:

```text
StudyBundle
  session_id, transcript_revision_id, coverage, generation_run_id
  notes: title, summary, sections[{heading, claims[{text, source_refs}]}]
  lecture_overview:
    subject_result_id, objectives[], topics[], prerequisites[], revision_priorities[]
    each inferred content item: text, inference_kind, source_refs
  quiz_set_id, artifact_statuses, provenance, warnings[]
```

The quiz delivery object has question IDs, prompt, option IDs/text and optional source links; it omits the correct key and explanation until submission/explicit reveal. Source links must not expose server-only key fields. Example fixtures may intentionally reveal answers to developers but must not be served as a real unsubmitted quiz by accident.

`coverage` lists complete source intervals and any gaps. A partial report records its restricted coverage. `warnings` distinguishes incomplete source, uncertain ASR, unknown subject and stale output. Do not attach a numeric completeness percentage unless the denominator is defined.

## 4. Endpoint surface

All paths below are relative to `/api/v1`. Responses refer to objects above; ordinary create uses 201, asynchronous job acceptance 202, successful reads 200 and completed deletion 204. Deletion with pending cleanup may return 202 with inaccessible tombstoned content.

| Method / path | Request / behavior |
| --- | --- |
| `GET /capabilities` | iPhone/iOS + Android target info, typical 30–60-minute duration and ten-hour maximum, supported media/limits, output languages, classifier modes, safe provider-configured flags and actual locked build/contract version; no secrets |
| `GET /budget` | Authenticated private-demo aggregate: USD ceiling, settled/reserved/uncertain amounts, contingency and available admission capacity. No lecture content/other-owner details. This read route cannot reset/increase budget or collect provider keys. |
| `GET /sessions` | Owned paginated library, optional state/search filters |
| `POST /sessions` | Create title/source kind/declared metadata; idempotent |
| `GET /sessions/{id}` | Session state, current revisions, artifact/job summaries and expiry |
| `PATCH /sessions/{id}` | Update title/declared metadata with expected resource revision; does not rewrite classifier history |
| `DELETE /sessions/{id}` | Tombstone, revoke media access, stop new jobs, clean server data; client also removes its local copy |
| `POST /sessions/{id}/uploads` | Expected bytes/digest/media description; server supplies upload ID and transport-part limits |
| `GET /uploads/{id}` | Verified received parts and expiry for resume |
| `PUT /uploads/{id}/parts/{index}` | Binary part + digest, bounded index/length; same digest safely repeatable, different digest conflict |
| `POST /uploads/{id}/complete` | Manifest/digest; verify parts, assemble/probe media, register source asset; no paid transcription yet |
| `POST /sessions/{id}/jobs` | Selected source/revision, stages/settings; return persisted job; reject incompatible or duplicate active pipeline |
| `GET /jobs/{id}` | Persisted stage status, safe failures, completed output IDs and usage |
| `POST /jobs/{id}/cancel` | Prevent future work; report limitations for in-flight provider operation |
| `POST /jobs/{id}/retry` | Explicit failed stages/input revision, with idempotency key; preserve successful checkpoints |
| `GET /sessions/{id}/transcripts/{revision}` | Timestamped text and coverage, with segment paging for long sessions |
| `POST /sessions/{id}/transcript-revisions` | Base revision and segment edits; create immutable revision, mark dependents stale |
| `POST /sessions/{id}/subject-overrides` | Subject/reason + source revision; retain original prediction |
| `GET /sessions/{id}/artifacts` | Versioned notes/overview with freshness and coverage; large output paginated/sectioned if needed |
| `GET /quiz-sets/{id}` | Public question data only; owned workspace and referenced session must be active |
| `POST /quiz-sets/{id}/attempts` | Start an attempt tied to exact quiz version and reveal history |
| `POST /attempts/{id}/submit` | Question→option map; validate question/option membership, freeze deterministic result; repeated identical request returns prior result |
| `GET /attempts/{id}` | Owned attempt; explanations/key available after submit, otherwise only draft metadata |
| `POST /quiz-sets/{id}/reveal` | Explicit solution reveal, records practice flag for related attempts; never counts as an unseen quiz score |
| `GET /audio-assets/{id}/access` | Owned short-lived stream/download mechanism with byte-range support; original-time playback |

A session may be local-only before the backend is reachable; the client maps its stable local ID to a server-created opaque ID once. Local/server ID association and idempotency prevent duplicate uploads after a restart.

Provider callbacks, if adopted, have a separate authenticated internal route with signature/replay validation and request correlation. Clients do not submit provider results. A private D0 worker may use bounded synchronous provider calls instead of requiring a public webhook receiver.

## 5. Jobs, errors and retries

Canonical stage IDs: `validate_media`, `prepare_audio`, `transcribe`, `classify_subject`, `generate_notes`, `generate_overview`, `generate_quiz`, `validate_outputs`. D0 may make one provider generation request internally, but records separate logical artifact outcomes. Stage states: `queued`, `running`, `succeeded`, `failed`, `canceled`, `blocked`; classifier outcome status is carried separately. Top-level job may be `partial` when some outputs succeed and others fail.

Error envelope:

```json
{
  "error": {
    "code": "provider_unavailable",
    "message": "Transcription is temporarily unavailable. Your recording is saved.",
    "request_id": "request_example",
    "retryable": true,
    "stage": "transcribe"
  }
}
```

Representative codes: `permission_required`, `unsupported_media`, `media_corrupt`, `duration_limit`, `size_limit`, `storage_limit`, `no_usable_speech`, `upload_incomplete`, `checksum_mismatch`, `revision_conflict`, `provider_unavailable`, `provider_submission_unknown`, `budget_exceeded`, `classifier_unavailable`, `invalid_generated_output`, `session_expired`, `deleted`. Use 401 for missing credentials, 403/404 as appropriate without revealing other owners' data, 409 for conflicts, 413 for bytes, 422 for invalid content, 429 for limits, and 503 for temporary dependency unavailability. A safe user message does not include vendor credentials or raw private content.

Every billable stage requires an atomic shared-ledger reservation within the total US$20 allowance before provider submission, including chunks/retries. Store reservation correlation and conservative price bounds; a timed-out submission stays reserved. Reject insufficient/unknown budget with `budget_exceeded` or a safe price-configuration error before any paid call. Ledger state persists through restart, session deletion/expiry and key rotation. Test concurrency and lifecycle cases with synthetic charges.

Never return `retryable=true` for a paid ambiguous submission without telling the backend adapter to reconcile it first. UI retry invokes server logic; it does not directly duplicate provider calls.

## 6. Integration fixtures and compatibility

Before parallel coding, agree on realistic fixtures for empty library, recording, queued upload, interrupted/recovered media, complete and partial transcript, valid outputs, wrong/uncertain/missing classifier, failed quiz, stale revision, budget block, expired/deleted session and a scored/revealed attempt. Clearly label all fixtures as development data.

The shared contract gate requires both clients to render these fixtures and the backend to validate them. Model fixtures must include a genuine artifact signature when available and an unavailable-mode fixture before then. Contract changes are reviewed by Ben and Alex; changes to subjects/tokenization also require the model lead. Styling changes do not change enum values or API routes.
