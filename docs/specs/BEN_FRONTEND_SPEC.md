# Ben — Mobile Application and Web Frontend Specification

Version 0.3 · 2026-11-04 · Project name undecided; “Lecture Companion” is a working descriptor.

**Owner:** Ben. **Status:** web study foundation, foreground browser recorder and native Expo recorder source implemented locally; API integration, native installation and physical-device verification remain pending. Sections 11–12 separate the checkpoints and evidence. Companion specs: [Alex — backend/API/model/shared gates](ALEX_BACKEND_SPEC.md) and [Michelle — interface design](MICHELLE_INTERFACE_DESIGN_SPEC.md).

## 1. Ownership and shared baseline

Ben owns functional iPhone/iOS, Android and web clients: recording/local files, navigation/state, upload, API integration, transcript/study rendering, taking/reviewing quizzes, connection recovery and implementing Michelle’s design. Alex owns the laptop service, provider keys/calls, data/job persistence, source/pack versions, budget and authoritative scoring. Michelle owns information/interaction/visual design, components and implemented usability review. Design changes preserve functioning controls and data semantics.

The user is Alex. Confirmed operating choices: typical 30–60-minute recordings, maximum ten hours; both native platforms; server and uploaded data on his current laptop; combined US$20 demo API allowance; provider keys entered privately through a terminal launcher. Select latest stable compatible packages at setup, then pin. This document does not collect keys, install packages or start builds/services.

The selected engineering stack is React Native/TypeScript with Expo development builds, and React/Vite/TypeScript for web, subject to G0 compatibility/recorder proof. Share types/API client/error/quiz logic and design tokens where useful; capture, storage, permissions, file selection and playback remain platform adapters. Do not make universal component reuse a prerequisite.

Use **only** [Alex’s canonical API](ALEX_BACKEND_SPEC.md#4-canonical-api--conventions-and-access): `/api/v1/config`, `/recordings`, `/jobs`, `StudyPack`, and **seconds** in public duration/timing fields. Generate frontend types/fixtures from one agreed backend schema when implementation is authorized. No separate `/sessions` schema, public millisecond fields or client-invented job enums.

Future code layout can use `apps/mobile/`, `apps/web/`, `packages/contracts/` plus Alex’s service/worker/ML boundaries once authorized. These are proposed source locations, not existing commands or permission to bootstrap.

## 2. Workspace, connectivity, and frontend state

No account login/profile flow. The private demonstration uses one operator-provisioned shared workspace: every authorized client sees the same uploaded library, and deleting a server recording affects all of them. Unuploaded phone media remains local. Never imply personal accounts/private uploaded libraries or automatic private-history sync.

Configure the laptop’s reachable LAN/hotspot base URL; phone localhost is the phone, not Alex’s server. Provision app-access credentials outside normal student flows, separately from provider keys: native secure storage/bearer access, web secure cookie/CSRF as Alex defines. Do not add provider-key entry fields or ship keys in clients. A connection failure has a clear reconnect/settings route without erasing local media. Exact phone/OS/browser/LAN/signing details are recorded at G0.

Separate native capture, transfer, server job and output freshness:

- Capture: idle, requesting permission, recording, paused, interrupted/error, finalizing, saved/recovered partial.
- Transfer: local only/selected, uploading, incomplete/failed, uploaded. Persist local→server ID association and pending operation key.
- Server job: render Alex’s exact status/stage/error, not an invented upload/recorder state.
- Output: current, outdated, partial or unavailable; reflect exact transcript/pack coverage.

Use services/state independent of a single screen lifecycle. A native recorder must not stop merely because its component unmounts. Restore persisted files, associations/jobs and quiz drafts after relaunch where supported. SQLite/private files are a native candidate; browser fragments/metadata need quota-aware durable storage such as IndexedDB, with eviction limits disclosed. Do not accumulate long media in React state/RAM. Cache content per configured demo access and invalidate server-deleted content.

## 3. User journeys

### Native record, save, and learn

1. Open the library without account registration. Distinguish local files from uploaded/shared entries. Offer Record and file import.
2. Explain microphone use and request permission when needed; capture starts only from Start. On denial, offer settings/retry and import without fake recording.
3. Show a real sound-level waveform/input status, elapsed captured audio, Pause and Stop. Pausing stops adding audio; Resume continues the same logical recording, with paused wall time excluded from audio duration.
4. Stop from either recording or paused state finalizes locally first. Save audio and title/date/duration even when the server/network is unavailable. Show playback/local save status, then explicit Process.
5. Before Process, explain the shared library and transfers to ElevenLabs/LLM. Upload only if needed; persist server Recording ID; separately request the processing Job.
6. Display actual stage/retry/partial/budget status. Leaving the results view does not cancel server work; reconnect/reopen looks up the existing job rather than creating another.
7. Read Transcript, Notes, Overview and Quiz from the returned pack. Source links open exact supporting transcript revision/segments; F1 also seeks original audio by seconds.
8. Submit answers and display backend score/explanations/evidence. Retake is new practice, never an overwritten prior attempt or mastery claim.
9. Delete local and/or uploaded data through clearly scoped controls, then reconcile shared state.

The same flow must work on actual iPhone **and** Android. A simulator/library capability list does not prove either platform passed. D0 uses short inputs; F1 includes full 30-minute/60-minute recordings and separate ten-hour maximum endurance.

### Desktop web upload and learn

Start with upload: accessible file browse and drag/drop → review details/limits → upload/save → explicit Process → poll/open pack → quiz/feedback. Web refresh returns to the shared library/job without repeating paid processing. Retain the selected input across recoverable upload errors; deleting server data never deletes the original computer file.

Browser foreground recording belongs to F1: explicit microphone permission, real input meter, pause/resume/stop, persisted fragments and recovery, then the same upload/processing contract. Build it after the initial web-upload path; do not label it permanently optional. Browser background/lock-screen recording is outside the selected promise. Explain suspension and detect stopped tracks where possible without claiming continuous capture while frozen.

### Import and source review

Support mobile file selection as well as web browse/drop. Show known filename, bytes, decoded/local duration if available, title, playback and tested limits. Unknown duration stays unknown until verified by Alex. Validate against `/config` for fast feedback, while the server remains authoritative. Extension/client MIME alone is insufficient. Oversized/overlong/corrupt/unsupported media gets an actionable error, not silent truncation or a paid job.

## 4. Recorder, time, and long-session reliability

Prevent overlapping sessions and duplicate Start/Stop/Save actions. The amplitude waveform must respond to actual input rather than random animation; text status/timer remain available to screen readers. Duration derives from recorded intervals/verified media, not delayed UI callbacks. Use source seconds in local models/API adapters; user-facing `mm:ss`/`hh:mm:ss` is formatting, not another measurement contract.

Persist checkpoints toward Alex’s roughly ten-second target. A cache URI is not a saved library. Native file rotation must avoid silent gaps and retain metadata; browser emitted fragments need their container initialization/context and may not be standalone decodable files. Capture checkpoints, upload parts and provider chunks are different concepts. Send the ordered capture manifest for resumable intake rather than treating blob count as duration.

Test calls, input disconnects, permission changes, screen locking/backgrounding, app/OS termination, low disk/battery and interrupted finalization on both phones. If the recorder cannot protect valid data until Stop, resolve the adapter/native implementation before claiming the recovery goal. Show interrupted/recovered partial recordings and gaps honestly; never silently resume an OS-denied microphone.

For routine 30–60-minute lessons, test the entire save/playback/upload path. At 90% of duration/storage quota warn; at the actual cap finalize safely rather than discard. Proposed input byte limit and maximum audio duration come from `/config`; they are independent. If configuration is temporarily unavailable, use a previously verified or bundled contract-compatible local recording limit, clearly mark paid processing unavailable, and reconcile with the server later. Do not silently impose the old three-minute/ten-minute product cap or assume an unlimited fallback.

Web foreground recording uses appropriate secure origin and durable storage with quota checks. Browser storage may be evicted; offer recoverable source/export guidance as supported, not a universal durability guarantee. Capture does not require a provider connection; budget exhaustion must not disable saving locally.

## 5. Screens and states for Michelle’s handoff

| View | Required function and non-happy states |
| --- | --- |
| Library/home | Title/date/duration/source/local-or-shared status, Record/Import/Upload, open/process/delete; empty, offline, access denied, missing local file and recovered partial |
| Recorder | Permission/input status, real waveform, active timer, Pause/Resume, Stop/finalize; paused/interrupted/low storage/limit reached/saving failure |
| File review | Filename/bytes/duration when known, playback/title, verified limits, Upload/Process distinction; invalid/corrupt/too-large/too-long |
| Recording detail/processing | Local/server identity, actual upload/job stage, budget block, partial coverage, safe errors/retry; preserve previous valid outputs |
| Study workspace | Notes/Overview/Transcript/Quiz, selected lesson/subject/output language, actual classification source, current/outdated pack and coverage |
| Transcript | Unicode/mixed-language segments, real/null timestamps, search and selected reference; F1 paging, original-audio seek and correction/revision |
| Quiz/feedback | Prompt/options, selection/progress/unanswered, submit/error/pending; actual score and selected/correct answers, explanations, references and practice-revealed state |
| Details/cleanup | Safe provider/model versions, expiry policy, local versus shared deletion consequences; no provider keys/private raw logs |

Use scrolling/virtualization/pagination for long transcripts rather than loading ten hours of display content at once. A pack’s `transcript_segments` can be only its initial page; fetch subsequent or referenced segments through Alex’s revision endpoint. Preserve readable equations/units and unknown/inaudible text rather than “repairing” content on the client.

Michelle can combine views/layouts, but must preserve required callbacks, semantic roles, state visibility and touch/keyboard access. Deliver functioning low-style components early; review with actual returned content and representative errors before cosmetic polish.

## 6. Upload, job, and budget integration

Read `/config` capabilities/enabled features, verified active limits, full-target limits and `capacity_status`, plus `/budget` safe accounting. Show prototype restrictions honestly; a short-fixture envelope is not a replacement for the 30–60-minute/ten-hour requirement. D0 one-shot multipart and F1 resumable `/uploads` both produce the same Recording; persist that ID and operation keys. For resumable uploads, reconcile received part/digest state with the laptop after disconnect/restart and resend only missing verified parts. A part is transport bytes, not necessarily a playable audio chunk.

Use Alex’s exact idempotency semantics on upload/job/quiz/revision actions. Retrying unresolved transport uses the same key/body; deliberate new processing/regeneration/attempt uses a new key. Uploading never silently starts paid work. Show byte progress only when actually available; processing uses stage labels, not invented percentages or remaining-time promises.

Poll the current job about every two seconds while relevant/visible, backing off offline/idle; stop polling terminal states and refresh on return. One shared client query/service owns each active poll, not every component. Inspect both HTTP status and Job.status: a failed/partial/blocked job may be HTTP 200. A failed-stage retry asks Alex to reuse completed work; the client never retries providers directly. A different input while a job is active may conflict and requires explicit recovery, not overwriting IDs.

Show safe estimated next/session cost and settled/reserved/remaining total demo allowance. The US$20 guard is authoritative on the server; clients cannot refill/reset it or bypass via another workspace/key/retry. Use friendly warning/blocked copy, retaining recording/transcript/cached results. Provider-configured booleans can guide setup help, but a settings page must not collect ElevenLabs/OpenAI keys; Alex’s terminal handles them.

## 7. Study content, revisions, and classifier provenance

Render the returned structure without client-generated replacements. Notes are source-linked points under headings; Overview is subject/description/topics with any clearly inferred objectives/prerequisites/revision priorities. Technical file metadata and quiz performance are distinct. Source references open the pack’s exact revision, including historical supporting text when the current transcript changed.

Display actual `classification.source`: Student model, AI baseline or Unclassified. Also show `custom_status` where useful so an abstention/load failure is not hidden by a baseline fallback. Baseline/unknown score is null; never invent percentages. A selected manual `subject_override` is labeled separately from raw prediction. Offline/not-configured modes are explicit, never hidden fixtures.

F1 text correction creates a new immutable revision; warn that old outputs become outdated and regeneration uses budget. Submit base revision/expected concurrency token; conflicts preserve both edits for explicit reconciliation. In-flight jobs retain their captured input; an old completion cannot silently become current. Old submitted quiz results remain reviewable against their original pack/key/evidence.

Notes/overview can be accessible while quiz generation failed. `quiz_status: insufficient_evidence` with zero questions yields an honest partial output and no score; do not show five empty placeholders or mark assessment complete. Lost source chunks/gaps and explicitly restricted reports remain labeled partial. Audio seeking may be unavailable when timing/media is missing; show text evidence instead of a fake timestamp.

## 8. Quiz submission and practice

Read only public questions from the immutable StudyPack. Keep draft selections locally against exact pack/question IDs; a new pack must not inherit answer positions. Only `quiz_status: available` is answerable; `insufficient_evidence`, `failed` and `unavailable` have explicit no-submission states. Show unanswered count and confirm incomplete submission. Submit every question exactly once with option ID or null plus `study_pack_id`; disable duplicate actions while pending.

The backend returns correctness and percentage; do not ship/fetch private keys in advance or calculate an authoritative score locally. Render correct/incorrect/unanswered, selected/correct options, explanation and source. A network retry reuses its operation key; intentional retake creates another attempt. After solutions were viewed/submitted, show practice/revealed status rather than an unseen-test claim. F1 explicit solution reveal follows Alex’s endpoint and records its effect.

If the pack/recording was deleted, changed or is outdated for new submissions, show a recovery route to current material; do not fabricate a grade. Prior submitted attempts stay tied to their historical pack. Quiz results describe this question set/attempt, not overall intelligence, learning improvement or validated mastery. Report-question action can retain provenance for Alex’s review without silently rewriting a past score.

## 9. Deletion and offline behavior

Provide explicit scopes:

- Delete from this phone: remove local audio/index/drafts as selected; leave shared uploaded material alone.
- Delete uploaded lecture and study data: call the Recording delete route, explain it affects all demo clients, and leave any phone original unless local deletion is also selected.

Web cannot remove the original selected computer file. After shared deletion, invalidate caches/packs, clear server links on phone entries and reconcile stale jobs; recording may remain as local-only. An offline pending server delete stays visible until acknowledged. Cleanup cannot refund in-flight vendor work or reset the shared spend ledger.

Capture/save/local library and explicitly cached study content can work offline. Upload/server/library access requires the reachable laptop; transcription/generation also require provider internet. Budget/provider outage leaves saved data accessible. Any prepared fallback says Previously generated example and retains provenance; do not make it look like a fresh live processing run.

## 10. Collaboration, gates, and acceptance

Follow [Alex’s G0–G6 gates](ALEX_BACKEND_SPEC.md#11-shared-delivery-gates-and-acceptance), without a second sequence or numeric API definition here. Start web upload→real outputs/quiz at G1; make a native capture proof on both phones early, then integrate at G2. ML data work and Michelle’s flow/tokens can proceed alongside these streams. Complete 30/60-minute normal sessions and revisions/design at G4, maximum/browser/recovery at G5, and rehearse full evidence at G6.

| Handoff | Concrete deliverable |
| --- | --- |
| Alex → Ben | Canonical schema/config, realistic success/error/partial/unknown fixtures, base URL/access setup, budget states, source/pack version semantics and actual enabled limits |
| Ben → Alex | Real device audio/MIME/container and capture manifest, reproducible upload/codec/interruption issues, actual phone/browser versions |
| Ben → Michelle | Functional view inventory, required controls/callbacks, state screenshots/fixtures, components and accessibility constraints |
| Michelle → Ben | Flow/wireframe/token/component states, responsive layouts/copy, annotations and implemented review findings |
| Ben → team | Repeatable both-phone/web walkthrough, LAN setup, observed failure limits, shared-library/deletion behavior and honest saved example |

- [ ] Both actual phones perform start/pause/resume/stop/save/waveform/import/playback; library/date/duration survive relaunch/offline.
- [ ] Permission denial, call/background/storage/save/upload/provider/budget failure shows truthful recovery without losing valid checkpoints.
- [ ] Desktop web supports browse/drop and F1 foreground recording; keyboard/larger-text and actual browser behavior are checked.
- [ ] One-shot/resumable intake, reconnect, repeated taps and reload follow canonical IDs/keys/states without duplicate logical work.
- [ ] Actual pack fields/source pages/classifier source/coverage/old revisions render correctly; no secret or pre-submit answer key is delivered.
- [ ] Correct/incorrect/unanswered/new attempt/revealed/stale/deleted/retry flows agree with backend results.
- [ ] Local and shared deletion scopes are clear; connected clients reconcile shared changes; content-free spend survives cleanup.
- [ ] 30-min/60-min and ten-hour device runs, bounded navigation/memory and source-time playback have real evidence before capacity claims.
- [ ] Michelle’s implemented design preserves required behavior, and live versus fixture/saved examples is unmistakable.

These remain acceptance checks. The documentation merge alone ran no frontend/device tests. The subsequent implementation checkpoint below records the narrower local results; no full gate is passed.

## 11. Implementation checkpoint — 4 November 2026

Ben explicitly requested starting implementation and confirmed Alex’s API is not ready. Ben named iPhone for testing; model/OS and Android device details remain unknown. This session implements the first web slice under `apps/web/`, preserving the full iOS/Android and F1 requirements above. It does not implement Alex’s backend or claim G0/G1 complete.

Implemented: React/TypeScript/Vite bootstrap; operator-supplied laptop address with credentialed requests and no provider-key input; paginated shared library; browse/drop, local playback/title/format/size/duration review; IndexedDB retention of pending upload file/title/key; explicit upload separate from consented processing; persisted processing operation keys; visible job status/errors, foreground polling/backoff and terminal-job polling stop; Notes/Overview/Transcript/Quiz; exact-revision source lookup, transcript pagination and loaded-page search; classifier provenance and outdated/partial/no-quiz states; pack-scoped persisted quiz drafts and immutable attempt history; frozen same-key retries after uncertain submissions; shared deletion confirmation/cache invalidation. Presentation follows Michelle’s neutral/teal exploration defaults and is not her reviewed final design.

Native capture/import, resumable transport, browser recording, transcript editing, regeneration/subject override, explicit solution reveal, audio source seeking, offline study cache, complete coverage/gap presentation and long-session/endurance proof are not implemented in this slice. The web client has original playback but does not claim tested codec support. Browser draft persistence is subject to quota/eviction and does not replace the original file. Acknowledged pending uploads can be cleared locally with an uncertainty warning; this never deletes a possible server copy.

### Alex integration handoff

There is no backend OpenAPI/schema yet. `apps/web/src/api.ts` contains isolated runtime consumption guards derived from sections 4–5 of Alex’s spec, not a new canonical API definition. Replace them and the synthetic test responses with generated types/fixtures from Alex’s single implementation schema when available. The UI fails visibly on incompatible responses instead of silently using sample content.

The prose leaves several wire spellings/shapes incomplete. Current adapter assumptions needing Alex’s agreement are `accepted_mime_types` in config; budget’s decimal-string `total/settled/reserved/uncertain/contingency/available`; override’s `subject`; attempt `results` with `question_id/selected_option_id/correct_option_id/correct/explanation/evidence_segment_ids`; flat artifact status map; transcript `id/segments/next_cursor`; and 202 deletion `{status}`. No production compatibility is asserted. Config languages/features/provider setup, complete coverage/gap rendering and request estimates need integration work before enabling a real demo.

Web transport uses `credentials: include`; the provisional CSRF convention reads `csrftoken` and sends `X-CSRFToken`. Alex must provide the actual operator provisioning/CSRF convention, exact allowed origins/HTTPS behavior, cookie settings and a real access-denial/deletion/retry walkthrough. No login, bearer token field or provider credential workaround was added. Same-origin hosting is preferred; cross-origin access requires explicit server cookie/CORS configuration. Neither CORS nor the UI is access control.

Pending mutation records are scoped to the configured service address. Retries keep the original body and key; deliberate practice creates a new operation. The backend must enforce the stable workspace namespace, semantic multipart digest, deletion checks and atomic spend guard. The frontend never calls a provider or calculates an authoritative grade.

### Verification record

Environment: local macOS host, Node `24.15.0`, npm `11.12.1`. Registry-resolved stable packages pinned exactly with `package-lock.json`: React/React DOM `19.3.1`, Vite `8.3.5`, React plugin `6.2.1`, TypeScript `7.0.2`, Zod `4.6.7`, Vitest `5.1.0`, Playwright `1.64.1`. Expo/React Native were not installed or compatibility-claimed.

- Type checking and production build pass.
- 11 focused unit tests pass: request headers/access, safe errors, HTTP-200 blocked states, response guards, retry key/body persistence, storage failure, seconds/ten-hour formatting and independent file limits.
- 8 isolated Google Chrome browser tests pass with synthetic test responses: disconnected start; upload lost-response/reload/key reuse without processing; source revision lookup/transcript paging/provenance; quiz lost-response/reload/locked-payload/practice restoration; partial/outdated/no-quiz; budget-blocked HTTP 200; scoped deletion; 360px reflow. These are frontend tests, not live API, decoding, provider or device evidence. Test fixtures are imported only by tests and are absent from the application build.
- No paid requests, training, provider keys, API service, native build, physical device/endurance run, Michelle usability signoff or deployment occurred. Remaining gates stay open.

Next integration step: Alex publishes the single implementation schema and provisions a reachable test service; Ben aligns the adapter and runs one short real web upload→transcript→study→server-feedback flow. The early actual-iPhone recorder proof and Android inventory/proof remain G0/G2 work.

## 12. Recording-first checkpoint — 4 November 2026

Ben clarified that the audio recording interface is the priority and requested a modern, compact, user-friendly interface. This supersedes the previous upload-first implementation ordering without removing the existing study features or full-target gates. Recording is now the initial screen, independent of Alex’s API; laptop setup is a secondary action. Michelle’s final review remains pending.

The compact design uses a light neutral surface, editable lesson title, explicit capture status, large tabular timer, actual-input waveform, coral Start action and reachable Pause/Resume plus Stop & save controls. Recorder and Library navigation, local-first copy, inline recovery, playback/import/export and narrowly scoped deletion remain functional. Idle visuals are static; no random waveform is used as capture evidence.

### Browser implementation

`capture.ts` owns recording outside screen lifetimes. The foreground recorder uses MediaRecorder and an actual Web Audio input meter. The timer uses recorded intervals rather than callback counts and excludes user pauses. Microphone access is requested only from Start. Browser audio fragments are written in order to IndexedDB with their container initialization retained; stopping waits for pending writes and stores local metadata before reporting Saved. Startup labels abandoned stored captures as recovered partial, with no promise that a crashed container is playable. Failed writes retain pending fragments in the current page for an explicit retry. Import/export/playback and browser-local deletion are available without provider access. Use for study hands the selected local file to the existing explicit upload path.

Hidden-page capture pauses with visible guidance; interrupted/ended tracks and permission denial have explicit states. AudioContext activation occurs during the user gesture so an audio-meter activation wait cannot leave capture stuck in permission state. An unavailable meter is labeled, and the meter’s state alone is never treated as proof that media capture stopped. Browser storage remains quota/eviction dependent; the normal/maximum-duration and iPhone/Safari evidence is still missing.

### Native implementation

`apps/mobile/` now contains an Expo/React Native recording application with the same recording-first layout, phone safe areas and Record/Library navigation. Its app-level recorder service uses `expo-audio`, actual metering/native recorded duration, pause/resume/stop, app-document audio paths, SQLite metadata, local playback, document import, user-controlled export and phone-local deletion. Metadata checkpoints retain the document URI and observed duration; process-loss recovery is labeled incomplete and does not claim the ≤10-second audio-loss target. There is no silent auto-resume after interruption and no API/provider call in the native recorder.

Background recording is configured in the native plugin/audio mode, but its actual behavior, calls, Bluetooth/input changes, lock screen, disk pressure, pauses, finalization, process termination and recovery require physical testing in a development build. The selected local safety limits retain the 36,000-second and 2,000,000,000-byte targets; they are not measured capacity claims. Native timer/status monitoring plus a native duration request and Android size limit are implemented, but their reliability under suspension is unverified. Native upload/demo-access integration remains pending Alex’s API.

### Setup and evidence

Expo `58.0.23`, React Native `0.88.1`, Audio `58.0.11`, FileSystem `58.0.13`, SQLite `58.0.15`, DocumentPicker `58.0.4`, Sharing `58.0.22`, Crypto `58.0.7`, DevClient `58.0.18` and SafeAreaContext `5.11.1` are pinned from the SDK’s compatible package set. React/React DOM are aligned to the SDK’s `19.3.0` across the workspace, with one runtime instance enforced; the earlier web-only `19.3.1` checkpoint is historical. Native TypeScript is `6.0.3` per the Expo starter; web TypeScript remains `7.0.2`. `npm ls react` verifies one deduplicated version. Expo’s local dependency check reports the chosen SDK dependencies up to date (offline mode does not verify remote updates).

Type checks pass for both apps; the web production build passes; Metro/Hermes exports for both iOS and Android pass. The 11 existing unit tests and 13 browser tests pass. The five new recorder browser tests use Chrome’s synthetic media device to exercise real recording APIs: actual playable saved audio; excluded pause time; local persistence across reload; no API requirement; denial/retry/import; service lifetime across views; hidden-page pause and stopping while paused; incomplete-session recovery; and a 390px phone viewport with controls in view and no horizontal overflow. Test images label synthetic microphone input. The existing eight study/browser tests still pass after navigation changes.

No native binary was built, signed, installed or distributed. No actual iPhone/Android microphone, Safari, 30/60-minute recording, ten-hour endurance, measured recovery loss, provider processing, API integration or Michelle usability approval is established. These remain open G0/G2/G4/G5 evidence requirements. The local browser interface is reviewable now; native readiness must be assessed on actual test phones.
