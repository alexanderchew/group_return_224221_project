# Michelle — Mobile and Web Interface Design Specification

Version 0.3 · 2026-11-04 · Project name undecided; “Lecture Companion” is a temporary descriptor, not final branding.

**Owner:** Michelle. **Status:** merged design specification; no approved final screens, implemented accessibility, device result or learning-effectiveness claim is implied.

Companion specifications: [Ben — functional mobile/web](BEN_FRONTEND_SPEC.md) and [Alex — backend, canonical API and shared gates](ALEX_BACKEND_SPEC.md). These three documents are the active set; earlier planning/design drafts are archived.

## 1. Design responsibility and baseline

Design an experience in which students can tell what to do next, whether audio is really being captured/saved, and which lecture text supports the study output. Michelle owns information hierarchy, navigation/interaction proposals, wireframes, visual tokens, components/states, responsive behavior, content guidance, accessibility annotations and implemented usability review for both mobile and web. Ben implements working behavior and the agreed designs; Alex owns processing, source versions, classification, scoring and operations.

This is a substantive interface role, not merely recoloring screens. Ben builds a functional end-to-end path first while Michelle can begin flow analysis, wireframes and tokens. Michelle redesigns functioning views without removing controls, changing API semantics or hiding failure states; any behavior/payload change is reviewed with Ben/Alex.

The user is Alex. Target **iPhone/iOS and Android**, plus desktop web. Most recordings last **30–60 minutes**, with a **ten-hour maximum**. The service/data live on Alex’s laptop, reached over a trusted LAN/hotspot; paid APIs are external and share **US$20 total**. Provider keys are entered privately in the laptop terminal, not a student interface. No account-login screen or public-commercial flow is in this demo.

The merged engineering defaults are in Alex’s spec; exact versions are latest stable compatible releases resolved/pinned at setup. The canonical API uses Recording/StudyPack resources and seconds, but endpoint/enum names should not appear in ordinary student copy. Ben renders their meaning without inventing states. All uploaded material belongs to a **shared controlled demo library**, visible to authorized demo clients; unuploaded phone audio stays local. Do not imply a personal private account.

## 2. Design goals and scope

| Goal | Interface consequence |
| --- | --- |
| Record with confidence | Distinguish recording/paused/interrupted/finalizing/saved; readable timer, real sound meter and reachable Stop |
| Understand the pipeline | Separate local save, upload, explicit paid Process, server stages and ready/partial results |
| Read and revise comfortably | Clear notes/overview/transcript separation, readable measure, source links and long/mixed-language content |
| Check actual lesson understanding | Usable MCQs and feedback with lesson evidence, not unsupported overall mastery labels |
| See honest provenance | Student model versus AI baseline versus unclassified; manual override and saved examples labeled accurately |
| Recover safely | Specific denied-permission/offline/storage/budget/provider/partial/stale-data actions; persistent errors rather than vanished toasts |
| Use both phone and desktop | Consistent terminology/components adapted to actual platform sizes, keyboard and accessibility needs |

D0 design supports short real web upload/mobile flows. F1 retains browser foreground recording, normal and maximum durations, transcript corrections/revisions, source-audio navigation, resumable/partial states and model provenance. These are sequenced in [Alex’s shared gates](ALEX_BACKEND_SPEC.md#11-shared-delivery-gates-and-acceptance), not a separate design roadmap.

Outside the baseline: accounts/profiles, payments, public hosting, social/gamification/progress dashboards, flashcards/chatbot, decorative 3D and elaborate animations. Free-text grading, syllabus/topic/dialogue models and export formats need a separate adopted requirement. Do not spend initial design time implying these features exist.

## 3. Information architecture and principal flows

Suggested structure:

- Library/home: starting point, local/shared identity, Record/Import or Upload and existing recordings.
- Recording detail: what is saved, local/server state, title/date/duration, playback, Process and scoped deletion.
- Study workspace: Notes, Overview, Transcript and Quiz with one clear selected lecture/version.
- Quiz feedback/history: exact attempt score, explanations, source evidence and labeled practice retake.
- Safe details: processing provenance, configured limits/budget summary and cleanup consequences without provider secrets.

Mobile can use tabs or a compact section selector. Desktop can use navigation plus a wider reading area/optional transcript split view, with comfortable text width rather than full-screen long lines. A user should know which lecture/pack is open and how to return.

### Native capture and import

`Library → Record → Permission → Recording ↔ Paused → Stop/finalize → Saved locally → Review → Upload if needed → explicit Process → Study → Quiz → Feedback`

Also design file import from the phone. Show denied microphone, call/input interruption, background/lock restriction, recovered partial audio, low storage, finalization failure and offline branches. The waveform responds to Ben’s real amplitude samples; never specify random animation as recording proof.

### Web upload and browser recording

D0: `Library → Browse/drop → File review → Upload → Saved on server → Process → Study → Quiz → Feedback`.

F1: `Library → Record in browser → Permission → Foreground capture/pause → Stop/save → same upload/process path`.

Browse remains keyboard-accessible even with drag/drop. Selecting/uploading is separate from processing. Browser background recording is not promised; explain actual interruption/available-data status rather than claiming the recorder ran while suspended.

## 4. Required screens and state matrix

| View | Required states/content | Review question |
| --- | --- | --- |
| Library | Empty/populated, local-only/shared/uploading/processing/ready/failed, missing local file, recovered partial, offline/server unreachable; title/date/duration | Can a new student start/reopen a lesson and know which copy exists? |
| Native recorder | Idle, permission request/denial, recording/paused/interrupted, finalizing/saved/error, low disk/cap reached | Is actual capture status obvious, and can the user finish safely? |
| Web recorder F1 | Permission, active/paused/stop, foreground guidance, suspension/recovered fragments and storage issue | Does the UI state match what the browser actually captured? |
| File review | Empty/drag-over/selected, filename/bytes/duration when known, playback/title, unsupported/corrupt/too-large/too-long | Can the user recover without losing source selection? |
| Recording detail | Local/server association, known versus unknown recorded date, playback, explicit Process and deletion scopes | Is save distinct from upload and paid processing? |
| Processing | Upload progress when measured, queued/preparing/transcribing/analysing/generating/validating, partial/blocked/failed/canceled | Does copy explain actual work and next action without fake percentages/countdowns? |
| Notes | Supported sections/points, long text/formulas/units, source references, unavailable/outdated/partial coverage | Can the student scan and verify the lesson’s content? |
| Overview | Subject/description/topics, optional labeled inferred objectives/prerequisites/revision priorities, original/output language | Is educational overview separate from file metadata and quiz performance? |
| Transcript | Paged/searchable long Unicode content, real or unavailable timestamps, selected evidence/playing span, correction conflicts | Can the user reach the exact supporting revision/segment and recover an edit? |
| Source audio | Original-time playback/seek where timing/media exists, unavailable source/unknown time | Does the jump correspond to actual lesson audio rather than shifted processed time? |
| Quiz | Unanswered/selected options, progress/count, submit pending/error, fewer supported questions/no-quiz state | Can students answer/review without accidental double submission or leaked answer cues? |
| Feedback/history | Correct/incorrect/unanswered, actual denominator/percentage, selected/correct options, explanation/evidence, practice-revealed flag | Does feedback teach without claiming broad mastery? |
| Version/regeneration | Current versus outdated pack, pending new generation, old submitted attempt review, cost notice and edit conflict | Can the user distinguish old evidence from new text? |
| Budget/provider block | Safe warning/remaining allowance where useful, paid-stage blocked, saved/local actions still available | Is the next available action clear without exposing internal keys/vendor logs? |
| Deletion/cleanup | Local only versus shared uploaded content, cancel/confirm/pending offline/failure; effect on all clients | Does the user understand which originals/results remain and who else is affected? |

A view may combine states/layouts if distinctions remain clear. Alex owns exact Job.status/stage/shape; Ben maps them to this design. Do not create a competing enum, API table or new scoring behavior.

## 5. Visual system and responsive behavior

These are design exploration defaults, not an approved finished identity.

| Element | Proposed direction |
| --- | --- |
| Tone | Calm study workspace, clear primary action, strong readability |
| Color | Neutral background/dark text, one blue/teal accent; semantic warning/error/success with text/icons |
| Type | System-font family with verified Mandarin/Malay/English coverage; page/section/body/caption hierarchy and readable mathematics |
| Spacing | Small reusable scale such as 4/8/12/16/24/32 logical units; consistent panel/input spacing |
| Components | Button/icon-button, recorder indicator/meter/timer, recording card/row, picker/drop area, stage/budget badge, tabs, note point/reference link, option card, feedback, confirmation and inline error |
| States | Default/pressed/focused/disabled/loading/selected/empty/success/warning/error where relevant, preserving semantic roles/callbacks |
| Motion | Minimal functional feedback; reduced motion respected; waveform animation bounded so capture remains responsive |
| Branding | Temporary text title/simple mark; no large illustration project before core flow works |

Review representative 360, 768 and 1280 logical-pixel widths plus actual phones’ safe areas. Specify one-column narrow layouts, tab overflow, wrapping/buttons, long filenames/titles and reading measure; extra desktop width can show transcript beside notes without making paragraphs too wide. Avoid hover-only controls.

Use realistic fixtures: long subject terms, equations/units, Mandarin and Malay/code-switching, unknown recorded date, 30/60-minute and ten-hour duration labels, one/five/zero supported questions, failed/outdated packs and a baseline/unknown subject. Do not design solely around tidy short examples.

## 6. Accessibility and interaction quality

These are measured review targets, not a certified-conformance claim:

- Aim ordinary-text contrast 4.5:1 and large-text/UI contrast 3:1 where applicable; check actual chosen pairs.
- Aim primary touch targets at least 44×44 logical units, especially Pause/Stop/options/destructive controls.
- Text/icons accompany color for capture status, error, selection and correctness; waveform is supplemental to timer/status.
- Specify visible keyboard focus, sensible reading/tab order, accessible names and keyboard operation for browse/drop alternative, tabs/options/dialogs/submit on web.
- Annotate important status announcements without overwhelming screen readers with every timer or meter update.
- Check 200% text/zoom where supported, wrapping, equations and both phone safe areas; do not hide critical duration/status in tiny captions.
- Important recording/submission/budget failures remain inline with actionable recovery; a transient toast alone is insufficient.
- Keep Stop reachable, warn before discard, distinguish shared deletion and provide cancel; respect reduced-motion settings.

Ben validates actual platform semantics/keyboard/device behavior, Michelle reviews the implemented result and Alex validates server consequences. Mockup annotations alone do not pass accessibility or function gates.

## 7. Product copy, provenance, and educational feedback

| Situation | Suggested intent/copy |
| --- | --- |
| Active capture | “Recording · 30:14” plus true input indicator; never shown after capture ends |
| Paused | “Paused · Resume or stop and save” |
| Recovered partial | “Recovered recording · Some audio may be missing” with actual available duration |
| Local save | “Saved on this phone” |
| Shared upload | “Saved in the shared demo library” |
| Processing | Human descriptions of the actual stage: transcribing, preparing study materials, checking lesson references |
| Offline | “Your saved recording is available here. Connect to process it.” Use “Recording continues” only while capture is actually active. |
| Budget block | “Demo processing allowance reached. Your recording is saved.” Offer local review/retry when Alex resolves budget; no student refill control. |
| Subject | “Subject: Chemistry · Student model,” actual “AI baseline” or “Unclassified”; manual selection separately labeled |
| Unsupported quiz | “This lesson does not contain enough supported material for a quiz.” Show valid notes if available, not fake questions. |
| Outdated content | “Generated from an earlier transcript” with review/regenerate context |
| Generated study content | “AI-generated review material · Check lecture references” without a teacher-verification claim unless reviewed |
| Saved fallback | “Previously generated example” |
| Score/practice | “3 of 5 correct on this quiz”; if answers already seen, “Practice · Solutions previously revealed” |

Before Process, briefly explain shared access and that audio goes to ElevenLabs and transcript content to the configured LLM. Match Alex’s explicit deletion/post-event cleanup policy; do not promise deletion from provider systems. No provider-key entry or account login belongs in normal student flows. Safe cost/provenance details can appear in a details panel when useful to Alex/the judges; raw endpoint names, internal IDs, exception traces and token accounting do not belong in main task copy.

A feedback panel includes selected answer, correct answer, explanation, unanswered label when appropriate and source link. Invite revision/another practice attempt without shaming, diagnosis or invented long-term progress metrics. “Meta” is lesson content overview, not attention/emotion/intelligence analysis.

## 8. Deliverables and handoff

1. **Flow map and screen inventory:** native/web paths, local/shared distinctions and major error/recovery branches.
2. **Low-fidelity wireframes:** every required view and primary action, including partial/outdated/budget states before decorative polish.
3. **Design tokens:** colors, type, spacing, radii, elevation/borders, icons and component sizing, centralized for safe restyling.
4. **Component/state sheet:** default/focus/pressed/selected/disabled/loading/empty/success/warning/error states and required semantics.
5. **Detailed mobile and desktop layouts:** actual-length sample content, narrow/wide rules, both native safe areas, long-duration/large-text cases.
6. **Clickable walkthrough or annotated flow:** enough for a teammate to try record/upload→study→quiz; use an available tool without requiring a paid design platform.
7. **Implementation annotations:** transitions/callback constraints, copy, responsive wrapping, source links, version warnings, accessibility names and motion behavior; supply an export/annotated image with any tool-specific link.
8. **Implemented review log:** observed issues, proposed fixes, owner and actual verification after Ben’s changes; include at least one teammate who did not build the tested screen.

Michelle can begin flows/tokens while Ben/Alex build the baseline. Ben provides real functional screenshots/fixtures, required callbacks and capture/API constraints. Michelle changes presentation/components while preserving data contracts, access/deletion behavior, revision/quiz provenance and reachable recording controls. Changes requiring a new payload/function are agreed with Alex/Ben first and recorded in the owning spec.

## 9. Shared gates and acceptance

Follow [Alex’s G0–G6 sequence](ALEX_BACKEND_SPEC.md#11-shared-delivery-gates-and-acceptance): early inventory/wireframes at G0, review real web D0 at G1, both native flows at G2, honest custom/baseline states at G3, implemented design/normal lessons/revisions at G4, maximum/browser/recovery at G5 and timed full rehearsal at G6. There is no separate design calendar or assumed contest date.

- [ ] Every required view and major error/recovery state has a handoff and implemented review.
- [ ] A teammate can record/import/upload, recognize paused/saved/shared state, process, read notes, answer and inspect evidence without coaching.
- [ ] Both iPhone and Android plus desktop web use consistent terms while adapting layouts/interaction; foreground-browser limitation is clear.
- [ ] Shared library/local originals, deletion scopes, paid Process and budget blocks are understandable without an account/privacy misconception.
- [ ] Long/mixed-language content, null timestamps, one/no-quiz cases, model fallback/unknown, partial coverage and old versions remain readable.
- [ ] Contrast/touch/focus/large-text/semantic names/reduced motion are reviewed in actual implementations.
- [ ] Ben implements the design without breaking capture/save/retry/API/scoring/source navigation; critical usability issues are resolved and checked.
- [ ] Live processing, genuine team inference, external baseline and saved fixtures/examples are distinguishable; scores do not imply validated mastery.

During rehearsal, record hesitations, mistaken status interpretation, lost answers and failed recovery on actual devices/network. Fix these before extra branding/animations. This is practical usability evidence, not proof of educational effectiveness. No final design implementation or product test has been executed by this documentation merge.
