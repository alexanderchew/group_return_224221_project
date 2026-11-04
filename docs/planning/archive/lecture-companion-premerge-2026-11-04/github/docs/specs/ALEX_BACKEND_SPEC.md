# Alex — Backend, Processing, and AI Integration Specification

Version: 0.1 · Prepared: 2026-11-04 · Project name: undecided

**Owner:** Alex. **Status:** specification for review; no application, model, or test result is implied by this document.

Companion specifications: [Ben — mobile and web frontend](BEN_FRONTEND_SPEC.md) and [Michelle — interface design](MICHELLE_INTERFACE_DESIGN_SPEC.md).

## 1. Source, authority, and project assessment

This specification analyzes the supplied **AI-Powered Student Learning Assistant — Comprehensive Project Summary and Preliminary Requirements**. Its sections 3–6 define the product and AI workflow; sections 7–8 describe collaboration; sections 10–13 identify demonstration needs and gaps. The latest user request establishes Alex as backend owner, Ben as mobile/web frontend owner, and Michelle as frontend interface designer. Michelle's assignment therefore supersedes the source's earlier “acceptance pending” wording.

The user requested **three Markdown specifications**. The custom-model training and evaluation requirements are included here, rather than creating the fourth specification suggested in the meeting summary. Alex owns inference integration; the person leading dataset preparation and training still needs to be named.

The useful product is the complete loop: **lecture audio → transcript → notes and lecture overview → questions → answer feedback**. The main delivery risks are unsupported generated material, recording loss, incompatible frontend/backend assumptions, external-service delays, and weak evidence for the custom model. Subject classification alone does not establish improved learning or an advantage over an existing language model.

Throughout all three specifications:

- **Confirmed:** a requirement in the supplied brief or latest user request.
- **Proposed:** a concrete recommendation to make implementation possible; team review can change it.
- **Open:** an unresolved choice or external fact. No competition rule or deadline is inferred.
- **Later:** outside the recommended first demonstration unless separately selected.

This is documentation work. The earlier AR project stays removed. These specifications do not bootstrap an application, install dependencies, deploy services, or establish that any milestone has passed.

## 2. Confirmed scope and ownership

| Requirement | Backend responsibility | Other owner / boundary |
| --- | --- | --- |
| Mobile recording, pause/resume, waveform, saved sessions, dates, durations, deletion | Accept finalized audio and persist server records | Ben owns device recording and local files; Michelle designs all states |
| Web upload, including drag and drop | Validate and accept prerecorded audio | Ben implements the uploader |
| ElevenLabs speech-to-text | Call the service and normalize its response | Provider credentials stay on the backend |
| Lecture notes | Generate structured, lecture-grounded notes | Ben renders; Michelle establishes reading hierarchy |
| Lecture metadata | Return subject, description, and topics separately from notes | Ben renders both without conflating them |
| Lecture-based assessment and checking answers | Generate questions, retain answer keys, validate submissions, return feedback | Ben implements taking/reviewing a quiz |
| TensorFlow/Keras subject classifier after the baseline | Define the inference adapter and integrate a real trained artifact | Dataset/training lead remains open; see section 8 |
| No login for the initial demonstration | Proposed private, shared demo workspace | No account-based synchronization or user isolation is promised |
| Prepared recordings plus live recording demonstration | Process representative consented samples and preserve provenance | All three owners rehearse their part |

**Later:** browser recording, ten-hour sessions, denoising, silence removal, chapter classification, learned concept selection, free-text grading, accounts, public multi-user hosting, cross-device personal libraries, commercialization, and presentation slide generation. These were possibilities or unresolved considerations, rather than settled first-version requirements.

## 3. Proposed implementation defaults

These are recommendations, not technologies selected in the source discussion.

| Decision | Proposed default and reason |
| --- | --- |
| Backend | Python with FastAPI and typed request/response validation; keeps service integration and TensorFlow inference in one language |
| Persistence | SQLite for records/jobs/results; a private filesystem directory for uploaded audio; no cloud storage dependency for the first demo |
| Hosting | One laptop backend on a trusted demonstration network, with outbound internet for ElevenLabs/OpenAI; all connected demo clients share one workspace |
| Work scheduling | One bounded worker, one processing job at a time, with persisted job status; no queue platform required initially |
| AI generation | OpenAI Responses API with a supported Structured Outputs model, selected through configuration after a sample test |
| Assessment | Target five single-answer multiple-choice questions, four options each, one point per correct answer; backend scoring |
| Input envelope | Initially propose a maximum of 10 minutes and 25 MiB per audio file, both enforced independently; accept MP3, M4A, and WAV only after each is proven through the actual decoder/provider path |
| Language | Preserve original transcript text, including Chinese and Malay. Propose English generated materials for the first demo, visibly labeled; supported input-language combinations require sample verification |
| Polling | Frontends poll job status approximately every two seconds while visible, backing off on connection failures |

A provider's maximum recording length does not establish this application's recording, upload, or processing capacity. Ten hours remains an unresolved expansion. A WAV file may hit the byte limit before the duration limit. Publish tested limits through the configuration endpoint; do not advertise an untested format or language.

The exact frameworks/versions, demo phone/OS, network setup, provider models, cost ceiling, retention policy, and language policy must be settled before implementation claims or a real classroom trial. Do not pin versions based on this document alone.

## 4. Processing and failure behavior

```mermaid
flowchart LR
    A[Mobile saved audio or web file] --> B[Backend upload validation]
    B --> C[Persist recording and queue job]
    C --> D[ElevenLabs transcription]
    D --> E[Normalize transcript segments]
    E --> F[Subject classification adapter]
    F --> G[OpenAI notes, overview, and quiz generation]
    G --> H[Validate structure and lecture references]
    H --> I[Publish study pack]
    I --> J[Backend checks submitted quiz answers]
```

1. Uploading stores a recording; processing starts only when requested. Capture or upload must not silently trigger paid processing.
2. Validate actual file content, media type, size, and decoded duration. Use server-generated filenames and identifiers; reject corrupt, empty, or unsupported audio.
3. Persist the recording before acknowledging a successful upload. Persist jobs and completed stages so a page refresh does not lose progress.
4. Transcribe with ElevenLabs. Convert returned words/timestamps into stable transcript segments. Preserve the text; represent unavailable timestamps as `null` instead of inventing times.
5. Run the classification adapter. Initially it uses the OpenAI baseline; after the model checkpoint it can use the student-trained classifier with explicit fallback reporting.
6. Generate notes, overview, and quiz candidates using the transcript as the content boundary. Subject predictions are organizational hints, not additional lesson evidence.
7. Validate the generated payload and references. Store an immutable, versioned study pack and private quiz answer key before marking the job ready.
8. Accept quiz answers against that exact study-pack version and calculate correctness on the backend.

### Job states

`queued → transcribing → analysing → generating → validating → ready`

Any active stage can become `failed`. These states describe backend work; they are separate from Ben's local recorder and upload states. Report a stage rather than a made-up completion percentage.

- A failed job includes a safe error code, message, stage, and `retryable` flag. Keep the original saved recording available.
- Reuse valid completed stages when retrying a failed job; do not retranscribe merely because generation failed.
- An explicit failed-job retry creates a new job ID and updates the recording's `latest_job_id`; preserve the previous failure history and reuse its valid completed stages.
- Permit one active job per recording. A repeated process request returns that active job. A ready recording opens its existing pack; regeneration is outside the initial UI.
- At backend restart, mark unfinished jobs `failed` with `processing_interrupted`; an explicit retry resumes from persisted work. Do not automatically repeat a paid call with an uncertain outcome.
- Bound provider timeouts and retries. A proposed ceiling is three attempts per provider operation, including the initial call, with backoff for retryable failures. Do not retry invalid input or missing credentials automatically.
- Handle no-speech/empty transcripts, service rejection, quota/rate limits, network loss, refusal, incomplete output, and invalid generated content distinctly. Never substitute a hidden sample result for a failed live run.
- If text exceeds the proven input/context budget, fail clearly. Chunking can be added and tested later; silently truncating a lesson is unacceptable.

## 5. Shared contract — canonical definition for Ben

This section owns the proposed API and data contract. Ben's spec links here instead of maintaining another definition. Before coding, Alex and Ben review it together; Alex then supplies a machine-readable schema and matching fixtures as implementation deliverables. All payloads use JSON, UTC ISO-8601 timestamps, opaque string IDs, and seconds for duration/timing. The API prefix is `/api/v1`; study-pack schema version is `1.0`.

### Resources

| Resource | Required contract |
| --- | --- |
| `Recording` | `id`, `title`, `source` (`mobile` or `web`), `recorded_at` (nullable when unknown), `created_at`, `duration_seconds`, `byte_size`, `mime_type`, `latest_job_id` (nullable) |
| `Job` | `id`, `recording_id`, `status` (section 4 enum), `updated_at`, `study_pack_id` (nullable), `error` (nullable) |
| `TranscriptSegment` | `id`, `text`, `start_seconds` and `end_seconds` (both nullable when timing is unavailable) |
| `StudyPack` | `schema_version`, `id`, `recording_id`, `created_at`, `output_language`, `transcript_segments`, `classification`, `metadata`, `notes`, `quiz_status`, `questions` |
| `Classification` | `label` (nullable), `source` (`custom_model`, `openai_baseline`, or `unknown`), `model_version` (nullable), `score` (nullable), `fallback_reason` (nullable) |
| `Metadata` | `title`, `description`, `evidence_segment_ids`, `topics` (objects with `text` and `evidence_segment_ids`) |
| `Notes` | An array of sections with `heading` and `points`; each point has `text` and `evidence_segment_ids` |
| Public `Question` | `id`, `prompt`, `options` (four objects with `id` and `text`), `evidence_segment_ids`; excludes correct-answer and explanation fields before submission |
| Private answer key | Study-pack ID, question ID, correct option ID, explanation, evidence segment IDs; stored only on the backend |
| `QuizAttempt` | `id`, `study_pack_id`, `correct_count`, `total_count`, `unanswered_count`, `percentage`, `results` |

`quiz_status` is `available` or `insufficient_evidence`. Aim for five valid questions; allow one to five if fewer are supported, and show the actual count. If zero questions are defensible, return `insufficient_evidence` with an empty question list and explain it. A ready study pack with no quiz is partial educational output, not evidence that the full assessment requirement passed. A transcript with no usable educational content should fail rather than produce an invented lesson.

Classification `score` is a model score, not a proven probability of correctness; baseline/unknown scores are `null`. Record the actual provider/model and prompt versions internally for reproducibility. In low-confidence fallback, return the selected baseline result with `source: openai_baseline` and a non-null `fallback_reason`; retain the custom prediction internally for evaluation. The frontend must never display a fallback result as student-model output.

### Endpoints

Paths in this table are relative to `/api/v1`.

| Method and path | Input | Success / behavior |
| --- | --- | --- |
| `GET /config` | None | `200`: `max_audio_bytes`, `max_duration_seconds`, `accepted_mime_types`, `output_language`, `workspace_mode: shared_demo`, `api_version` |
| `POST /recordings` | Multipart `file`, `source`; optional `title`, `recorded_at` | `201 Recording`; persist after content validation |
| `GET /recordings` | None | `200 {items: Recording[]}`; shared demo records, newest first |
| `GET /recordings/{recording_id}` | None | `200 Recording`, or `404` |
| `POST /recordings/{recording_id}/jobs` | Empty JSON object | `202 Job`; return an existing active/ready job on repeats; failed-job retry resumes persisted stages |
| `GET /jobs/{job_id}` | None | `200 Job`, or `404` |
| `GET /recordings/{recording_id}/study-pack` | None | `200 StudyPack`; `409 not_ready` until ready; `404` if recording is absent |
| `POST /recordings/{recording_id}/quiz-attempts` | `study_pack_id` and `answers` | `201 QuizAttempt`; backend calculates results |
| `DELETE /recordings/{recording_id}` | None | `204`; remove app-managed audio, transcript, study pack, answer key, attempts, and job data |

For upload, job creation, and quiz submission, require an `Idempotency-Key` header generated by the client per intended operation. Network retries reuse that key; an intentional new attempt/retry uses a new key. Persist the first outcome; reuse it for matching retries and return `409 idempotency_conflict` if a key is reused with different content. This prevents duplicate application work, but cannot guarantee that a provider never charges twice after an ambiguous network failure.

Deleting a recording also prevents an in-flight worker from publishing late results: mark it deleted before cleanup and discard later provider responses. A repeated delete returns `204`. Deleting a mobile local copy is a separate client action; the API cannot remove a phone file. Deletion cannot retract a request already received by an external provider or promise that provider's retention behavior.

### Quiz submission and scoring

Illustrative request; IDs are examples, not existing data:

```json
{
  "study_pack_id": "pack_001",
  "answers": [
    {"question_id": "q_001", "option_id": "option_b"},
    {"question_id": "q_002", "option_id": null}
  ]
}
```

Send each question exactly once; `null` means unanswered. Reject unknown or duplicate questions, invalid option IDs, a different study-pack version, and client-supplied scores/answer keys. The total includes unanswered questions; no negative marking. Return `percentage = 100 × correct_count / total_count`, rounded to one decimal place. For an available quiz, `total_count` is never zero. Per-question results contain `question_id`, `selected_option_id`, `is_correct`, `correct_option_id`, `explanation`, and `evidence_segment_ids`. A new attempt does not overwrite the earlier attempt.

### Error shape

```json
{
  "error": {
    "code": "transcription_unavailable",
    "message": "Transcription could not finish. Your saved recording is still available.",
    "retryable": true,
    "stage": "transcribing"
  },
  "request_id": "req_example"
}
```

Use this same error object inside failed `Job.error`, excluding the outer wrapper/request ID. Non-job errors have `stage: null`. Normalize framework validation errors to this envelope. Use `413` for size, `415` for unsupported media, `422` for invalid content/duration/answers, `409` for state or key conflicts, and `404` for missing resources. A processing failure can be returned by `GET /jobs/{id}` with HTTP `200` and `status: failed`; the frontend must inspect the job body.

## 6. Grounding, generation, and assessment quality

The brief's strongest requirement is that questions test **this lecture**. Apply the same boundary to notes and topics.

- Supply the transcript as untrusted lesson data, separated from application instructions. Spoken or uploaded instructions must not override system behavior, expose credentials, or trigger tools.
- Do not use web retrieval, general subject knowledge, or the predicted subject as substitute evidence for a missing lecture explanation.
- Generate a title, a short overview, topic list, organized note sections, and quiz candidates. These exact shapes are proposed, since the source did not settle a note format.
- Require transcript segment references for substantive note points, topics, and each question's correct answer/explanation. Check reference existence and valid answer-option relationships before publication.
- An evidence ID proves that a segment exists, not that it supports the claim. Human-review the demonstration set for relevance, factual faithfulness, ambiguity, and unsupported assumptions. Structured output alone does not establish educational accuracy.
- Reject ambiguous questions, multiple valid options, unsupported correct answers, and duplicate items. A bounded regeneration may replace rejected items; do not pad to five by inventing material.
- Retain immutable packs so question wording, answer keys, and prior scores remain consistent. Correcting transcripts and regenerating packs is a later workflow unless explicitly selected.
- Log the actual provider/model, prompt/schema version, input hash, timing, and available usage counts. Never describe service-generated notes as output of the student classifier.

**Proposed scoring rationale:** multiple-choice questions let the backend check a selected answer against a validated key without a second language-model grading call. The source required answer checking but left its method open. Free-text grading needs a separate rubric and evaluation effort before being included.

## 7. Storage, access, and operational limits

- Keep provider secrets in backend environment configuration. Exclude secrets, classroom audio, transcripts, and private datasets from Git and frontend bundles. Use synthetic or explicitly shareable fixtures for collaboration.
- For the no-login prototype, state clearly that every demo client sees the same server library. A local mobile recording stays on that phone until upload; there is no automatic personal-library sync.
- Bind/configure the laptop for the chosen trusted network, allow only the intended web origins, and test phone connectivity. CORS is not user authentication. A phone's `localhost` is not the laptop.
- Before uploading for processing, the interface explains that audio goes to ElevenLabs and transcript content goes to OpenAI. Use approved demonstration recordings; settle recording permission and retention arrangements before real classroom use.
- Proposed retention for the private demo: retain until explicit deletion, then clear the demo workspace after the event. Confirm that policy, storage path, and cleanup procedure with the team. Do not claim deletion from third-party systems without verified provider behavior.
- Enforce limits on streamed uploads, decoded duration, queued jobs, provider attempts, and output size. Record actual processing latency and usage on demo samples before agreeing to a cost or speed claim.
- Local recording works without internet; transcription and generation do not. A local backend still requires outbound access to the two providers. Prepared results may be opened offline only when explicitly identified as previously generated examples.

## 8. Custom-model training and integration plan

### Ownership and scope

Alex owns the classifier adapter and deployment into the backend. **Open:** assign the dataset/training/evaluation lead and helpers before model work starts. A practical recommendation is for Alex to coordinate the engineering and another available teammate to lead labeling/review; this is not an assignment made by the user.

The confirmed first task is **transcript text → academic subject** using TensorFlow/Keras. It is not speech recognition, chapter prediction, note generation, or question generation. English, Bahasa Melayu, Chinese, and Science are illustrative categories; choose the actual label set after reviewing available independent lessons. Distinguish the spoken language from the school subject.

### Dataset and evaluation requirements

1. Inventory usable recordings/transcripts and permitted reuse. Record sample ID, original lesson/recording ID, label, source, language(s), and human reviewer. Keep sensitive source material outside Git.
2. Define label boundaries, mixed-subject handling, and out-of-scope examples. Do not guess labels solely from filenames or transcript language.
3. Split by **original lesson/recording before chunking**. Excerpts, overlapping windows, or near duplicates from one lesson must not appear in multiple splits. Hold out teachers/speakers too when sufficient data exists, and report the actual boundary used.
4. A proposed starting split is 70% training, 15% validation, and 15% test by independent lesson, adjusted for dataset size and per-class coverage. If a credible test set is unavailable, state that limitation instead of reporting a misleading chunk-level accuracy.
5. Fit vocabulary/preprocessing only on training data. Use validation data for architecture, stopping, and abstention-threshold choices. Keep the test set untouched until the chosen model is evaluated.
6. Start with a compact TensorFlow/Keras text classifier. Evaluate Unicode-aware character or subword tokenization so Chinese text is not treated as a single whitespace-delimited word. Version normalization, window length, and any aggregation used for long transcripts.
7. Report class counts and independent lesson counts, accuracy, macro F1, per-class precision/recall, confusion matrix, inference time, and representative failures. Compare with a majority-class baseline and, if feasible, a simple text-classification baseline on the identical split.
8. Include code-switching, noisy transcription, and out-of-scope examples in a separate robustness review. Confidence thresholds do not by themselves solve out-of-distribution detection.
9. Save the actual trained artifact, label map, preprocessing configuration, dataset/split manifest hashes, seed, dependency versions, training command, and metrics. The model must load reproducibly outside the training session.

### Inference contract and honest fallback

Implement one internal interface:

`classify(transcript_text) → {label, score, model_version, abstained, reason}`

Before integration it is backed by a clearly labeled baseline. After integration, the TensorFlow/Keras artifact runs on the backend; mobile inference is unnecessary for this first task. If it is missing, fails to load, abstains, or cannot handle the input, follow a documented baseline/unknown path and expose the selected source through `Classification` in section 5.

Use a successful custom prediction to organize the recording and populate its subject metadata. It can guide the generation prompt's organization, but must not add content or erase conflicting transcript evidence. Demonstrate that changing a subject prediction never produces unrelated questions.

**Proposed model checkpoint:** publish credible held-out results, exceed the recorded majority baseline on macro F1, review every supported class, and demonstrate a real inference call feeding the app. This is a minimum engineering gate, not a promise of useful accuracy or competition acceptance. If it fails, retain the functional baseline and label the classifier experimental. Do not claim reduced overall cost, latency, or external-AI dependence unless that comparison was actually measured; notes and quiz generation still use OpenAI.

## 9. Shared delivery order and acceptance gates

These gates are the shared sequence for all three specifications. They are proposed ordering, not dates or completed work.

| Gate | Reviewable outcome | Alex's evidence / dependencies |
| --- | --- | --- |
| G0 — Contract and demo envelope | Agree stack, target phone/browser, limits, quiz format, languages, demo network, and contract | Typed schemas plus shareable success/failure fixtures; identify provider access, budget, competition-rule questions, and training lead |
| G1 — Web baseline | One short prerecorded lecture becomes transcript, notes, overview, and a checked quiz through the real web/backend path | Actual ElevenLabs/OpenAI calls; source references; server scoring; original and generated artifacts clearly identified |
| G2 — Mobile integration | Real phone start/pause/resume/stop/save, saved library, upload, processing, and quiz | Same backend contract; date/duration survive relaunch; failure/retry/delete behavior shown; Ben proves recording on the chosen device |
| G3 — Custom classifier | Held-out evaluation and genuine inference integrated without breaking G1/G2 | Versioned model/data/preprocessing, metrics, provenance badge, and fallback test; training lead must be assigned |
| G4 — Design and rehearsal | Michelle's approved designs implemented and both flows rehearsed | Real network/device run, measured timings/usage, representative samples, cleanup procedure, known limitations, and contribution explanations |

Michelle can prepare flows and design tokens early; functional screens are restyled after their behavior exists. Data inventory/labeling can begin early, while training and integration follow the working baseline. Do not wait until every component is finished to perform the first integration.

### Backend acceptance checklist

- [ ] Valid uploads persist; invalid media, oversized/overlong files, and empty/corrupt inputs return useful errors.
- [ ] Duplicate requests and refreshes do not create duplicate jobs or quiz attempts.
- [ ] Real audio produces all three educational outputs with traceable lecture evidence on the selected demo samples.
- [ ] A deliberately untaught topic is excluded; short or unusable input produces an honest limited-output/failure state.
- [ ] Correct, incorrect, unanswered, duplicate, invalid, and stale-version quiz submissions behave as specified.
- [ ] Provider timeout, quota/error, malformed output, refusal, interrupted job, and retry paths preserve the original recording.
- [ ] Deletion cleans app-managed data and an active job cannot resurrect it.
- [ ] API keys are absent from client payloads/bundles and shared fixtures.
- [ ] Custom-model and fallback paths report their actual source; measured evidence accompanies any performance claim.

These are planned checks. No boxes should be marked complete merely because source files exist.

## 10. Decisions and practical suggestions

| Priority | Decision / suggestion | Suggested participants |
| --- | --- | --- |
| First | Verify actual competition rules for external APIs and student-trained model use; obtain the real submission/demo dates | Team / organizer |
| First | Review the proposed API and one realistic fixture together before separate development | Alex + Ben |
| First | Assign the model-training lead and inventory independent labeled lessons now | Team; Alex owns integration |
| First | Prove a 1–3 minute consented example through the real pipeline before extending length or features | Alex + Ben |
| Before classroom use | Set recording permission, retention, access, and language expectations | Team / school contact |
| Before rehearsal | Measure end-to-end time, provider usage, and network reliability; prepare two or three subject examples and an honest saved-results fallback | All three owners |

The strongest presentation is a lesson-specific question with visible supporting lecture text, followed by a clear explanation of which tasks use external services and which use the student-trained model. Keep broader learning-progress claims out of the demonstration until they have their own evidence.

## 11. Technical references checked

Reviewed against official pages on 2026-11-04; these verify candidate capabilities, not this application's compatibility or results.

- ElevenLabs documents file transcription and returned transcript/timestamp data, supporting the proposed transcription adapter. [Create transcript](https://elevenlabs.io/docs/api-reference/speech-to-text/convert).
- Official OpenAI documentation describes schema-constrained Structured Outputs and also warns that content can still contain mistakes. This supports typed generation plus separate content review, rather than treating valid JSON as verified teaching material. [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
- TensorFlow documents loading, preprocessing, and classifying text, supporting a narrowly scoped text-classification training path. The architecture, dataset quality, and multilingual performance still need local evaluation. [Load text](https://www.tensorflow.org/tutorials/load_data/text).
