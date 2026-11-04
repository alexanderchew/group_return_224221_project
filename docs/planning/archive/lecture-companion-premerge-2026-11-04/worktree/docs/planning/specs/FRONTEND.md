# Functional frontend specification

Owner: Ben. Scope: LC-02/03/04/08/11/13/18/19. [Shared contracts](SHARED_CONTRACTS.md) define objects/API; [full behavior](../../PROJECT_SPEC.md) and [scope/defaults](../SCOPE_BASELINE.md) take precedence. Michelle owns presentation changes, not recording/processing business logic.

## 1. Proposed client structure

Use TypeScript domain/contracts, API client, state models and design tokens shared where useful. Native mobile and web have separate capture, storage, permissions, picker and playback adapters. Both iPhone/iOS and Android are confirmed mobile targets. React Native remains the framework candidate; separate React web is recommended. Resolve latest stable compatible packages at setup and lock verified versions, using the chosen Expo SDK’s supported React/React Native set if Expo is adopted. Shared code is not a promise that one component tree or browser recorder covers every platform.

Keep capture, local library, upload, remote jobs and result freshness separate. The recorder service survives screen navigation as the target permits; a React component lifecycle must not accidentally stop a native recording. Restore persisted sessions/jobs after application restart. Components invoke typed service actions; they do not call ElevenLabs/OpenAI or TensorFlow directly.

Native storage: private app files and a small local metadata database, with capability secrets in OS secure storage. Web storage: persistent media fragments/metadata via an appropriate IndexedDB/storage adapter, with quota checks and disclosed eviction limits. Alex’s current laptop is the confirmed backend/media store for the demo; native local checkpoints remain necessary before/while uploading. Both phone clients use the laptop’s configured LAN/hotspot hostname/IP, not device localhost. Provider keys are entered only through the laptop terminal launcher; clients have no provider-key entry field. Large media does not accumulate indefinitely in React state or RAM. API caches are scoped to the current workspace and cleared on deletion/access change.

## 2. Recorder behavior

Define legal transitions: idle→requesting permission→recording↔paused→finalizing→saved. Interruption can move recording to interrupted; recoverable data can then resume when safe or finalize as partial. Saving after a denied permission must not create a fake recording. Disable concurrent start/stop/finalize actions and handle repeated taps idempotently.

Waveform/input meter comes from actual input amplitude; offer a text input-level/status alternative. Optimize normal flows for 30–60-minute lessons; keep the ten-hour absolute maximum and hour-scale duration formatting. Keep timer derived from capture intervals/verified media, not accumulated delayed event callbacks. When paused, show a clear Paused label and Resume; user-paused wall time is distinct from active audio.

Persist checkpoints against CFG-01, and make recovery state visible. A checkpoint is valid only if media/container initialization and ordered fragments can be decoded after a crash. A browser timeslice blob need not be a standalone file; native rotation also must avoid silent gaps. Choose a verified recorder adapter rather than hiding this constraint behind the UI.

Stopping always finalizes locally first. Show preview, title, duration, local save status and Process action. Warn before destructive discard/delete. At the cap or low disk, finalize safely and explain the reason. Interruption/OS denial cannot be represented as continuous successful capture.

Native full-product behavior includes the agreed background/lock promise. Verify permissions/configuration and installed builds on actual devices; Expo Go alone is not evidence. Web foreground recording is the proposed promise; show guidance before a tab is backgrounded where possible, detect ended tracks, and recover saved fragments. Browser suspension can prevent immediate error detection, so never guarantee uninterrupted web capture without evidence.

## 3. Import, library and upload

Picker/drop zones enforce the advertised capabilities in the client for fast feedback; server decode/byte limits remain authoritative. Offer file picker on web even with drag/drop, and support keyboard activation. Show unsupported/corrupt/too-large/too-long distinctions. Local duplicate detection may warn by file digest but must not silently attach another user's result.

Library entries show local date, verified duration, title, source kind, processing state and subject/unknown. Search/sort and clear empty/loading/offline/expired states are useful. A local-only entry is usable for playback until upload succeeds. Deletion explains local/server effects and cleans local caches; an offline pending server delete remains visible until acknowledged.

Use the upload manifest/part routes with checksums. Persist received-part state and reconcile with the server after network/restart; upload only missing parts. Display byte progress for transfer, not invented processing percentages. Upload completion is distinct from media validation/transcription completion. Avoid automatically repeating paid stages on reconnect.

## 4. Processing and result views

Display the server's stages and actual outcomes. Poll according to CFG-04, pause/back off while offline, and stop polling terminal/deleted jobs. Leaving the screen must not cancel a persisted job. Show safe estimated request cost plus settled/reserved/remaining demo allowance under the combined US$20 ceiling, with a clear warning/budget-block state. The backend makes the reservation decision; clients cannot increase/reset the budget or bypass it with retry. Local capture and saved reading remain available when paid work is blocked. Expose retry for eligible failures and cancellation limitations. Raw vendor errors are mapped to safe actionable copy.

A session workspace links Transcript, Notes, Lecture overview and Quiz. Show current input revision, coverage, stale outputs, provider/classifier provenance and unknown/overridden subject. Notes that succeeded remain accessible when quiz generation failed. Transcript navigation resolves source IDs and original-audio times, with text-only fallbacks when timing/media is unavailable.

For long sessions, use segment paging/virtualized lists and bounded waveform thumbnails. Search results include context and source times. Editing text creates a new revision after a clear regeneration/cost explanation; preserve old results and show them as outdated. If a concurrent edit conflicts, show the newer revision and allow explicit reconciliation rather than discarding either edit.

Do not display model scores as universal certainty. Unavailable classifier copy should say “Classifier not connected”; uncertain subject allows Continue without subject or a separately attributed manual selection. Study output still comes from actual transcript content.

## 5. Quiz interaction

Render the exact public quiz version received. Local draft selections can be saved against attempt+quiz IDs; a newly generated quiz must not inherit old answer positions. Option selection, unanswered count, submission and retake are explicit actions. Confirm incomplete submission. Server scoring is authoritative.

Before submission, exclude keys/explanations from the network response as well as from the rendered view. Afterward display correct/incorrect/unanswered, score denominator, explanations and source links. Revealing solutions is labeled practice; it cannot be presented as an unseen test result. Show that a quiz belongs to an old transcript when applicable. Report-question action records enough provenance to investigate without mutating old attempt scores silently.

## 6. Ben-to-Michelle handoff

Deliver functioning low-style screens with documented component props, states, text requirements and stable semantic roles/test hooks. Design tokens control color/type/spacing; behavior services and API enums are separate. Michelle may replace layouts/components while preserving callbacks, status/error visibility, touch/keyboard behavior and citation/quiz logic.

Review at least narrow phone portrait, tablet/wide phone and desktop split view. No device-specific layout can hide Stop, recording status, failed-stage action or submit confirmation. Motion and animated waveforms must not prevent reduced-motion use or overwhelm capture performance.

## 7. Frontend acceptance

Ben supplies a repeatable checklist and evidence on the agreed device/browser matrix: permission denied, start/pause/resume/stop, imported-file playback, saved library after reload, offline upload resume, partial failure/retry, stale outputs after edit, uncertain/missing model, quiz scoring/reveal, deletion/expiry and actual source jumps. Include at least one long-session navigation check and native interruption probe.

Mock fixtures validate interface integration only. A working D0 requires real backend/transcription/generation; F1 requires real model and accepted endurance behavior. Record the actual tested iPhone and Android model/OS/build plus desktop browser and any unsupported paths; confirm a full 30-minute and 60-minute recording on both platforms before separate maximum-duration endurance.
