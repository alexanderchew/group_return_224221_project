# Backend and integration specification

Owner: Alex. Scope: LC-04/05/06/07/08/09/18/19/20/21. Use [shared contracts](SHARED_CONTRACTS.md), [scope/defaults](../SCOPE_BASELINE.md) and [project acceptance](../../PROJECT_SPEC.md). No service exists yet; all choices below are proposed implementation detail.

## 1. Service boundaries and storage

Proposed API: Python FastAPI with typed request/response models and generated OpenAPI. Confirmed demo host: Alex’s current laptop, retaining its database, source/derived media, transcripts, outputs and models locally. SQLite metadata/jobs, private local asset directories and one worker process with transactional job claiming remain the proposed storage/executor design. iPhone/iOS and Android clients connect over a trusted LAN/hotspot using the laptop’s configured reachable hostname/IP. Desktop web can use laptop localhost. External APIs require outbound internet; no public tunnel/router forwarding/cloud host is required. Bind the service only to the intended demo interfaces, preserve workspace controls and verify local network permissions/trusted HTTPS as appropriate. This supports a small private demonstration without requiring a cloud queue. Do not expose media via a general static directory.

Modules: workspace/access, session metadata, media/upload, pipeline jobs, ElevenLabs adapter, classifier adapter, LLM adapter, artifact/evidence validation, quiz scoring, deletion/expiry and usage limits. Keep provider schemas behind adapters and return the shared domain contract. A client request does not hold a ten-hour job open.

Resolve latest stable compatible packages and a supported Python runtime when authorized setup begins, then pin exact verified dependencies/lockfiles. Check TensorFlow compatibility with the laptop/runtime before choosing the interpreter; do not force an unsupported newest interpreter. No packages are installed in this task.

Store media/artifact bytes outside relational rows and use atomic write/rename plus transaction/checkpoint references. Keep manifests so interrupted writes are distinguishable from final assets. Persist job leases/heartbeats and terminal states; an expired worker lease triggers reconciliation, not blind resubmission. Local SQLite requires a coherent transaction/locking policy; multi-host operation would require a different persistence/queue design.

## 2. Intake and media preparation

Authenticate workspace, reserve quota, create upload manifest and accept bounded checksummed parts. Complete only after ordered part verification and total digest/size checks. Expire abandoned uploads and release reserved quota. Prevent path traversal and resource exhaustion; server storage handles are generated internally.

Probe decoded format, sample count, duration and channels with a maintained media decoder after implementation/tool approval. Bound temporary files, decoded samples, CPU time and working disk. Never trust extension/declared duration. Imported over-limit files fail clearly; recordings reaching their cap finalize safely. Save original bytes before derivation.

Create normalized/denoised/trimmed working media only when needed and configured. Persist transform version/options and original-time maps. Keep capture/transport/provider chunking separate. Use bounded decodable provider chunks with owned intervals and optional context overlap. Verify merged ordering, no duplicated overlap and explicit missing coverage. Adjacent anonymous speaker labels are not automatically the same real person.

## 3. Pipeline execution

Create one active pipeline for each session input revision/config according to CFG-04. Persist stage attempts and request correlations before external submission where possible. Reuse completed preparation/transcription/artifacts on an eligible retry. Record whether a provider submission is known complete, known failed or ambiguous. Idempotent local scheduling does not guarantee exactly-once vendor billing.

The worker stages match the shared contract: validate, prepare, transcribe, classify, notes, overview, quiz, validation. D0 may use a single structured generation request for simplicity while retaining separate artifact statuses. For F1 long transcripts, use bounded hierarchical processing with saved intermediate evidence and per-chunk retries.

Set explicit timeouts and bounded concurrency/retry policy. Retry transient network/rate-limit failures with backoff/jitter, honoring Retry-After; do not retry invalid input/auth/budget errors as transient. Reconcile timed-out submissions before resubmitting if the provider exposes retrieval/correlation. Stop expensive downstream work when budget/network prerequisites fail. User cancel prevents future stages; deletion always wins over a late completion.

## 4. ElevenLabs adapter

Send authorized audio from backend-held credentials to the selected, explicitly recorded speech-to-text model. Batch-after-save is the proposed initial mode. Request timestamps and available diarization only as required; avoid adding realtime sockets before their scope is adopted. Persist safe request correlation, model/config and returned raw transcript provenance.

The official [transcription overview](https://elevenlabs.io/docs/overview/capabilities/speech-to-text) documents standard-mode ten-hour support and supported inputs. That is a vendor limit, not proof of phone capture or account capacity. Provider settings/limits remain configurable and should be checked against the actual account before use. The [create-transcript reference](https://elevenlabs.io/docs/api-reference/speech-to-text/convert) defines returned timing data and asynchronous callback options.

Initial private worker can wait for bounded chunk requests instead of requiring a public webhook receiver. If webhooks are adopted, verify the documented authentication/signature, correlate immutable request IDs, reject replay/unknown jobs and honor deletion tombstones. Do not pretend a workspace setting or enterprise retention feature exists on the team's account.

Merge provider timestamps through chunk offsets/transform maps to original time. Missing timing/confidence stays missing. Save transcript even if the classifier/generator later fails. No-usable-speech and missing-chunk coverage are first-class outcomes.

## 5. Classifier adapter

Accept transcript revision and immutable compatible model bundle; return the shared prediction contract. Load model/preprocessing once, verify label order and finite output dimensions, and persist version/hash. Send transcript content only, excluding manually declared subject and file paths. Preserve window coverage/disagreement for session aggregation.

D0 returns explicit not-connected mode when the model is absent. F1 runs the real bundle. Failure/abstention may continue transcript-based study generation without an asserted subject. A manual override is separately stored. External subject fallback is not enabled implicitly and can never be counted as the own-model result.

## 6. Generation and grounding

Use an external LLM adapter; OpenAI Responses API is the proposed initial integration. Use schema-constrained outputs where supported and handle refusals/incomplete responses separately. The [official Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) supports typed/schema-constrained responses; it does not guarantee that generated facts or answers are correct.

Version prompts, schema, model ID and generation config. State the lesson context/output language, provide source-linked transcript spans, and treat transcript instructions as quoted evidence. The subject result is an advisory hint; unknown subject does not prevent generation. Do not supply tools for unrelated actions or fetch unsupplied syllabi silently.

For long content, count input tokens with an appropriate estimator and reserved output margin. Map bounded sections into source-linked factual extracts, merge/deduplicate with preserved citations, then generate final topic organization and questions. Store intermediate hashes/checkpoints and coverage. Summarization must not erase source refs or quietly omit later parts of a ten-hour input. Do not send all audio-derived text to one prompt on the assumption that it fits.

Validate schema, limits, option/key consistency, referenced transcript revision/segments/quotes and allowed markup before publication. Correct schema is not sufficient: review representative content for support and pedagogical accuracy. Bounded repair can request a corrected invalid artifact without repeatedly regenerating unrelated successful artifacts. Reject persistent failure and expose retry rather than fabricating text.

## 7. Quiz, revisions and deletion

Keep answer keys/explanations in server-only storage until submission or explicit reveal. Validate question and option IDs, score deterministically against the frozen set, and make identical repeated submissions return the same result. Reject changed answers after submission; retake creates a new attempt. Revealed solutions mark related practice history. No free-text grading is included in the first contract.

Transcript edits are optimistic-concurrency transactions creating new immutable revisions. Finish in-flight jobs against their captured input, mark older outputs stale, and never rewrite old quiz evidence. Retention deletion uses an inaccessible tombstone first, then removes all associated assets, uploads, revisions, attempts and cache entries. Recheck tombstones before every worker write; callbacks cannot recreate deleted records.

## 8. Access, budgets and observability

Authenticate every route and media stream. Capability secrets are hashed/revocable where applicable, stored securely and never logged. Browser cookies require CSRF handling for mutation. CORS is a browser restriction, not resource authorization. Use safe short-lived media delivery with range support and cache controls that preserve isolation.

The confirmed ceiling is US$20 for combined demo API spending, interpreted as total rather than per provider/session/month. Implement CFG-09 in a persistent ledger shared by API and worker, with atomic reservations and exact decimal/integer monetary accounting rounded conservatively. Warn at US$16 and retain the proposed US$2 contingency; admit a request only when settled charges + unresolved reservations + its bounded estimated maximum + contingency fit US$20. Reserve each media chunk, bounded LLM call, paid optional feature and retry before submitting. Estimates include billed transcription overlap/rounding and token/output bounds; unknown price, unknown bound or unaccounted usage fails closed. Disable paid add-ons unless deliberately configured.

Reconcile final usage against each reservation; an ambiguous timeout keeps the reservation until resolved, preventing duplicate paid retry. Preserve the ledger across worker/laptop restart, session deletion, expiry, credential replacement and date/month boundaries. It contains content-free accounting, not retained lecture text; deletion of study data must not reset available funds. Only Alex may revise/reset allowance deliberately; never let a mobile request or script restart replenish it. Provider account controls are supplemental, not a cross-provider budget controller. Actual billing/account fees/taxes can differ from estimates; reconcile them and halt on uncertainty or overrun instead of promising a perfect vendor-side hard cap.

Expose safe settled/reserved/remaining values and an actionable budget block; local recording/model inference/cached review remain available. Test reservation races, restart, retries, deletion and blocked next request using synthetic priced fixtures without spending real money. No subscription, top-up, minimum purchase or paid key-validation call is triggered automatically. Any new minimum purchase must be checked against the same allowance. Apply separate duration/byte/token/storage/concurrency limits before work as well. Logs contain request/stage IDs, timing, versions and error categories, not full private transcript or secrets. Track provider latency separately from local API responsiveness.

## 9. Backend acceptance

Evidence includes a real D0 run, repeated submission behavior, checksum mismatch and incomplete upload handling, server restart/stage recovery, one-provider-chunk failure, budget exhaustion, unknown classifier, invalid LLM evidence, transcript edit during work, two-workspace access isolation, deterministic scoring, expiry and delete-during-processing. Test meaningful failure paths rather than mirroring every helper implementation.

Before F1, demonstrate full 30-minute and 60-minute real recordings on both iPhone and Android plus separate ten-hour real-time endurance, bounded-memory long-media processing on Alex’s laptop, original-time citation accuracy and actual model-serving parity. Local capture endurance can avoid paid transcription; any paid processing still uses the same US$20 allowance. Save exact source/model/prompt versions and measured stage costs/timings. Documentation and provider feature pages alone satisfy none of these product gates.

## 10. Local demo launcher contract

The requested interaction is a terminal script on Alex’s current laptop. Proposed future entry point: `scripts/start_demo.py` (specified here only; the file does not exist yet). On a future authorized setup run it should:

1. Load non-secret local host/storage settings, the persisted US$20 ledger and the pinned runtime configuration. Show safe host/storage/budget status, including outstanding reservations, without resetting accounting.
2. Prompt through a no-echo terminal input such as Python `getpass` for `ELEVENLABS_API_KEY` and the selected LLM credential, using `OPENAI_API_KEY` if OpenAI is adopted. Never accept a key as a command-line argument, embed one in example commands or ask Alex to paste it into chat/browser/mobile. Existing explicitly supplied server environment can be supported without printing values.
3. Validate only local presence/configuration at startup; do not perform billable requests as a key check. Missing keys disable their paid stages with an actionable state while capture/saved examples may remain usable. EOF/interrupt aborts cleanly.
4. Pass keys into API/worker process environments, restrict them to processes that need them, launch without shell interpolation/debug tracing, and avoid putting keys in process arguments, client bundles, logs, crash diagnostics or files. Do not persist `.env`/plaintext secrets by default. Alex can re-enter keys when restarting.
5. Display the configured laptop LAN/localhost address and provider-configured booleans, not credentials. iPhone/Android use the laptop address; their own `localhost` is not the laptop. Verify phone reachability and permissions without opening a public service.
6. On shutdown, stop child services cleanly and retain recording/job/budget checkpoints. Remove transient credential references where practical; do not claim guaranteed memory erasure. No automatic account purchase, spending reset or dependency upgrade occurs.

Acceptance checks cover hidden input, canceled/missing key entry, no credential leakage to output/history/client/files, backend-only provider requests, persisted budget on restart, and both phones reaching the local service. This documentation update does not create/run the launcher, collect a key, start services, install packages or consume API budget. The server-side environment design follows the official [OpenAI API authentication guidance](https://developers.openai.com/api/reference/overview). The [OpenAI spending-controller guide](https://developers.openai.com/cookbook/articles/per_run_spending_controller_responses_api) supports conservative pre-request reservations and keeping uncertain costs reserved; extend that discipline to all providers with a shared durable ledger.
