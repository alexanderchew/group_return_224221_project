# Ben — Mobile Application and Web Frontend Specification

Version: 0.1 · Prepared: 2026-11-04 · Project name: undecided

**Owner:** Ben. **Status:** specification for review; implementation and device verification have not started.

Companion specifications: [Alex — backend and shared contract](ALEX_BACKEND_SPEC.md) and [Michelle — interface design](MICHELLE_INTERFACE_DESIGN_SPEC.md).

## 1. Purpose, source, and boundaries

Build the student's complete interaction with the learning assistant: capture or upload a lecture, request processing, read the learning resources, take a lecture-based quiz, and review feedback.

This document follows sections 3–5, 7–8, and 10–13 of the supplied project summary. The latest user request confirms Ben owns both mobile and web frontend development. “Confirmed,” “proposed,” “open,” and “later” have the meanings in [Alex's source and assessment section](ALEX_BACKEND_SPEC.md#1-source-authority-and-project-assessment). Frameworks and detailed behaviors below are proposals where the source left them unsettled.

Ben owns working controls, local audio persistence, navigation, frontend state, API integration, and implementing Michelle's approved design. Alex owns service calls, generated content, authoritative quiz scoring, server persistence, and classifier integration. Michelle owns interface flows, visual design, component specifications, and design review. Styling changes must preserve functional behavior.

No app login is required for the initial prototype. The proposed backend is one shared private demo workspace; opening the web on another device does not create a personal account or synchronize a phone's unuploaded recordings.

## 2. Recommended technical approach

**Proposed default:** React Native with Expo for the phone app, and React with Vite for the browser frontend, using TypeScript. Share API types, validation helpers, error handling, and quiz/result presentation rules where useful. Let audio capture and file selection use platform-specific adapters. Full component reuse is optional and must not delay a working flow.

The source mentioned a prior React Native preference but did not select a framework. Review this choice with Alex before bootstrap; choose and pin compatible versions during G0. Prove recording on the actual demonstration phone early. Do not assume both iOS and Android are supported merely because the framework targets both.

Suggested future code boundaries, rather than folders created by this documentation task:

- `mobile/`: native recording, local library, mobile screens, app configuration.
- `web/`: file upload, browser library, study and quiz screens.
- `shared/`: API types/client and fixture definitions shared with the frontend apps.

Keep one source of truth for network types: [Alex's shared contract](ALEX_BACKEND_SPEC.md#5-shared-contract--canonical-definition-for-ben). If the contract changes, update fixtures and both clients together.

## 3. Required user journeys

### Mobile: record and learn

1. Open the app without login and see saved local recordings and any uploaded/server entries available in the demo workspace.
2. Choose **Record lecture**. Explain microphone access and request permission when needed.
3. Start audio capture and show real elapsed captured duration and a waveform derived from incoming sound levels.
4. Pause and resume the same session. Paused time must not count as captured audio duration.
5. Stop and save. Keep the audio and session metadata even if the network or backend is unavailable.
6. Open the saved item; display recording date, duration, and local/uploaded/processing state.
7. Choose **Process recording** after the external-processing notice. Upload the finalized file if needed, then create/poll a backend job.
8. Open the generated transcript, notes, overview, and quiz when ready.
9. Answer questions, submit once, and show backend-returned correctness, explanations, and supporting lecture text.
10. Delete a local recording or its uploaded study data using clearly separate controls.

The source requires start, pause, resume, stop, waveform, multiple sessions, recording library, date, duration, delete, and process controls. Each must perform the stated action; visual placeholders are insufficient.

### Web: upload and learn

1. Open the web app without login and select **Upload lecture**.
2. Select one existing audio file using either drag and drop or an accessible browse button.
3. Display filename, size, known duration, tested format/length limits, and the external-processing notice. Unknown metadata stays unknown until the backend validates it.
4. Upload; confirm the stored recording, then let the student explicitly request processing.
5. Display job stages, then the same study resources and assessment behavior as mobile.
6. Refresh or revisit the server library to reopen stored results without starting another paid processing run.

Browser microphone recording remains **later**. Do not let it block required web file upload or mobile microphone recording. Bulk upload is also outside the proposed first version.

## 4. Screen inventory

These are functional views, not a mandated final visual layout. Michelle can combine or rearrange them if the required actions and states remain clear.

| View | Platform | Required information and controls |
| --- | --- | --- |
| Library / home | Both | Date, duration, title, state; open/process/delete; obvious Record on mobile and Upload on web; empty and unreachable-backend states |
| Recorder | Mobile | Start, pause/resume, stop and save, real waveform, duration, recording/paused/interrupted label, permission guidance |
| Upload review | Web; mobile upload happens from a saved item | File details, current supported limits, validation error, upload action, truthful upload status |
| Recording detail / processing | Both | Local versus server state, process action, current job stage, safe error and retry, navigation back to library |
| Study workspace | Both | Distinct Notes, Overview, Transcript, and Quiz sections; subject and actual classification-source label |
| Quiz attempt | Both | Question and four selectable options, progress, unanswered count, submit action, submission-in-progress state |
| Quiz feedback | Both | Actual score/count, per-question answer feedback, explanation, supporting lecture text, retry as a new attempt |
| Deletion confirmation | Both | Which local/server copy and derived data will be removed; confirm/cancel and request failure state |

A local playback preview is a useful small addition if time allows, but was not explicitly required by the source. Timestamped audio seeking, transcript editing, downloads/exports, learning dashboards, chat, and flashcards are later features.

## 5. Recorder and local data behavior

### Local recording state machine

`idle → requesting_permission → recording ↔ paused → saving → saved`

Denied permission returns to a recoverable idle/permission state. Capture or save failure enters `error` with an accurate explanation; an interruption enters a recoverable stopped/paused state according to what the audio API actually did. Never display “Recording” after capture has stopped.

- Prevent overlapping sessions and duplicate start/stop operations. Disable incompatible controls while an operation is pending.
- Stop from either recording or paused state must finalize the same session. Resume must continue that session instead of creating an unrelated library item.
- Draw a rolling waveform from real audio-level/metering samples. It may represent amplitude history, but it must react to actual sound; do not animate random bars. If metering is unavailable, show that limitation and resolve it before claiming the waveform requirement passed.
- Save finalized files in persistent application storage, with a durable metadata index. A cache URI alone is not a reliable saved library.
- Suggested `LocalRecording` fields: `local_id`, `title`, `recorded_at`, `duration_seconds`, `local_file_uri`, `byte_size`, `mime_type`, `server_recording_id` (nullable), and upload state. Keep this local model distinct from the backend `Recording` resource.
- On relaunch, reconstruct saved sessions from persistent metadata and reconcile missing files. A locally saved item must not disappear because the backend is unreachable.
- Test calls, permission changes, locking/backgrounding, app termination, low storage, and interrupted saving on the chosen device. Full crash recovery and background recording are unproven until tested; propose foreground recording for the first demo and clearly state its limits.
- Warn before navigation would discard active capture. A reasonable first-version policy is to require stopping/saving before leaving the recorder.
- Fetch the tested limits from `/config`; reject or stop/save at the active recording limit. Backend validation remains authoritative. If configuration is unavailable, use a previously retrieved limit; before the first successful retrieval, propose a clearly labeled three-minute local-only cap until configuration becomes available.

Expo's audio documentation covers recording and metering, and explains that default cache recordings may be removed by the operating system. If this stack is adopted, explicitly use persistent storage and verify the recorder behavior on the chosen SDK/device. [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/).

## 6. Upload, backend connection, and job state

Uploading and AI processing are separate states:

`local/selected → uploading → uploaded → queued → transcribing → analysing → generating → validating → ready`

An upload failure leaves the selected/local file available. A processing failure leaves the server recording available. These are frontend representations of the contract; do not add new backend enum values on one client alone.

1. Configure the backend base URL per environment. On a phone, the laptop's LAN address is required; phone `localhost` will not reach the laptop. Verify network/firewall and platform transport settings on the actual demo setup.
2. Read `/api/v1/config` and show the accepted media types, maximum bytes, maximum duration, output language, and shared-workspace explanation.
3. Use multipart upload with the required `source`. Save the returned server ID so retries/reopening do not create another recording.
4. Use idempotency keys as defined by Alex: persist a key while an upload/job/attempt request is unresolved, reuse it on transport retries, and generate a new one for a genuinely new operation.
5. Show actual upload progress only when the platform provides it. Otherwise show an activity state without a fabricated percentage.
6. Poll `/jobs/{id}` while the relevant view is active. Read both HTTP status and job `status`; a failed job can arrive in an HTTP `200` response.
7. Store the server recording/job IDs before navigating. After a refresh/relaunch, resume status lookup instead of creating another job.
8. Back off on network errors. Separate “Cannot reach the backend” from “AI processing failed”; show a useful recovery action for each.
9. Open an existing ready study pack without reprocessing. An explicit retry of a failed job follows the backend's persisted-stage behavior.
10. Stop polling when the view is inactive or the job is terminal; refresh status on return. Do not make every screen independently poll the same job.

Frontend code must call Alex's backend, not ElevenLabs/OpenAI directly. Provider keys and private answer keys must never be shipped to the browser or mobile app.

## 7. Study material and assessment behavior

### Study workspace

- **Notes:** render headings and concise points from the returned structure. Do not invent or silently rewrite missing content in the client.
- **Overview:** show subject, description, topics, output language, and a small classification-source label such as “Student model,” “AI baseline,” or “Unclassified.” Use the actual `classification.source`, including fallback cases.
- **Transcript:** preserve Unicode text, segment boundaries, and real timestamps when present. Display unavailable timestamps without invented values.
- **Lecture references:** selecting a note/question reference opens its supporting transcript segments. Audio seeking can be added later; seeing source text is sufficient for the proposed baseline.
- **Unavailable data:** distinguish an unfinished job, a failed job, and a completed pack with `quiz_status: insufficient_evidence`. An empty quiz is not a successful five-question assessment.
- Display AI-generated material as review material; do not claim it has been verified by a teacher unless a real review occurred.

### Taking and reviewing a quiz

1. Read the public question payload. Each item has four options and one selected option at most.
2. Let students navigate and change answers before submission. Show unanswered items; do not force a random answer.
3. Submit every question exactly once with an option ID or `null`, plus the immutable study-pack ID. Disable repeat submission while awaiting a response.
4. The backend determines score and correctness. The client must not fetch or embed the private answer key before submission.
5. On success, render `correct_count / total_count`, returned percentage, unanswered count, selected/correct options, explanations, and supporting lecture references.
6. A deliberate retry clears selections and creates a new attempt. A network retry reuses the same operation key; it is not a new attempt.
7. If a recording/pack is deleted or a version becomes invalid before submission, show a recoverable error instead of an invented score.

Proposed quiz formats and scoring are [defined by Alex](ALEX_BACKEND_SPEC.md#quiz-submission-and-scoring). Five questions is a target, not permission to pad a short lecture. Quiz scores describe this attempt; the initial app does not measure overall mastery or learning improvement.

## 8. Deletion, offline use, and recovery

Deleting has two distinct scopes, reflected in both controls and confirmation text:

- **Delete from this phone:** removes the local file/metadata. Uploaded/server data stays until separately deleted.
- **Delete uploaded lecture and study data:** calls the backend delete endpoint, removes that shared server item/results, and leaves any phone original unless the user also selects local deletion.

On web, only the server deletion action applies; the app does not remove the original file from the student's computer. After server deletion, reconcile mobile metadata by clearing its server link; an already deleted server item should not remain shown as ready.

Recording, saving, and listing local phone sessions can work without connectivity. Upload/transcription/generation require the reachable backend and provider internet access. Offline study-pack caching is later unless implemented and explicitly tested. Prepared sample results must say they were generated earlier; do not make a saved example appear to be a live result.

Before processing, explain the actual transfer: audio is sent to ElevenLabs, and transcript content is sent to OpenAI. Use Alex's agreed retention wording and show the shared-demo nature of uploaded data. Do not insert an account/login flow into the first demo.

## 9. Collaboration and handoffs

| Handoff | Ben provides / receives |
| --- | --- |
| Alex → Ben | Contract/schema, `/config`, realistic shareable fixtures, examples for every job/error state, base URL, known limits, provenance fields |
| Ben → Alex | A saved device-produced audio sample, actual MIME/container details, upload/integration issues, exact reproduction steps |
| Ben → Michelle | Functional screen inventory, navigation, recorder controls, state screenshots, constraints, and accessible components available |
| Michelle → Ben | Approved layouts, design tokens, component states, responsive behavior, copy, and review notes |
| Ben → team | Real mobile/web demo flow, chosen device/browser versions, observed interruptions, network setup, and known limitations |

Build with typed fixtures while Alex builds the service. Fixtures are visibly labeled during development; final gate evidence uses real backend/provider responses. Integrate one working endpoint early, before completing every screen. Michelle may prepare flows and tokens early, then redesign the working views without removing required functions.

## 10. Delivery order and acceptance

Use [the shared G0–G4 gates](ALEX_BACKEND_SPEC.md#9-shared-delivery-order-and-acceptance-gates).

| Gate | Ben's deliverable |
| --- | --- |
| G0 | Agree the contract, tested target device/browser, proposed stack, and design handoff; build navigable functional views with fixtures |
| G1 | Web file browse/drop → real upload → process → notes/overview/transcript → submitted quiz feedback |
| G2 | Chosen phone's complete recorder and persistent library → same backend flow; no silent recording loss or fake waveform |
| G3 | Render custom-model provenance and fallback states without breaking either platform |
| G4 | Implement Michelle's approved designs, resolve critical usability issues, and rehearse mobile and web on the actual demo network |

### Frontend acceptance checklist

- [ ] Start, pause, resume, stop/save, waveform, multiple recordings, date, duration, deletion, and processing work on the named phone/OS.
- [ ] Saved local recordings survive relaunch and backend/network unavailability.
- [ ] Microphone denial, interruption, save failure, upload failure, and AI failure have truthful states and recovery actions.
- [ ] Web supports drag/drop and keyboard-accessible browse; invalid files show the actual limits.
- [ ] Refresh/relaunch resumes job lookup; duplicate process/submission clicks do not create duplicate work.
- [ ] Notes, overview, transcript references, classifier source, questions, and backend feedback render from the actual API payloads.
- [ ] Quiz selection, unanswered items, new attempts, stale/deleted packs, and submission retries behave as specified.
- [ ] Local/server deletion scopes are clear and both clients reconcile deleted server data.
- [ ] Required controls remain usable on narrow screens, with larger text, and by keyboard on web.
- [ ] The live demonstration uses real processing; saved examples and fixture mode are unmistakably labeled.

Record actual device/browser versions and observed results before marking these checks complete.

## 11. Suggestions specific to Ben's workload

Ben has two clients to deliver, so prioritize the simplest shared workflow: **web upload first**, then integrate the phone recorder into the already working backend. In parallel, make a small native recording proof on the actual phone to discover permission/pause/storage issues early.

Reuse network/types/quiz logic, but allow native and web layouts to differ. Avoid spending the first iteration on a universal component abstraction, login, a dashboard, browser recording, or extensive animations. The first joint checkpoint should show one real lesson becoming useful notes and a checked quiz.
