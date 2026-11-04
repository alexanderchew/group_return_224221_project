# Michelle — Mobile and Web Interface Design Specification

Version: 0.1 · Prepared: 2026-11-04 · Project name: undecided

**Owner:** Michelle. **Status:** design specification for review; no final branding, screens, or implementation are claimed.

Companion specifications: [Ben — functional mobile/web behavior](BEN_FRONTEND_SPEC.md) and [Alex — backend, data contract, and AI workflow](ALEX_BACKEND_SPEC.md).

## 1. Design assignment and product understanding

Design an interface that helps a student turn a recorded lesson into readable study material and then check their understanding. The experience should make three things obvious: **what to do next, what is happening to the recording, and which lecture material supports the generated result**.

The supplied project summary's sections 3–4 describe the student tasks, sections 7–8 describe the design handoff, and sections 10–13 describe demonstration needs and reliability gaps. The latest user request confirms Michelle owns frontend interface design; the source's earlier pending acceptance no longer applies.

Michelle owns information hierarchy, navigation proposals, screen layouts, interaction design, colors, typography, components, status/error presentation, and usability review for **both mobile and web**. This is a substantial design role, not merely choosing colors. Ben implements the functional interfaces and approved designs. Alex owns processing, classification, generated content, and scoring.

The product name, visual identity, final stack, question formats, and detailed note format were not settled in the summary. The three-spec proposal recommends concrete defaults, marked **proposed**. Use the temporary title **Learning Assistant** until the team chooses a name; it is a placeholder, not an approved brand.

## 2. Design goals and scope

| Goal | Design consequence |
| --- | --- |
| Capture a lesson confidently | Obvious recording/paused/saved states, legible duration, responsive waveform, and separate pause/finish actions |
| Understand the workflow | Distinguish a saved file, upload, AI processing, and ready study materials |
| Read and revise comfortably | Clear note headings, readable measure/spacing, separate lecture overview and full transcript |
| Test actual lesson knowledge | Simple question/answer controls and meaningful feedback with lecture references |
| Trust what the app displays | Honest stage labels, actual model-source labels, clear uncertainty/failure, and visibly identified saved examples |
| Work on phone and computer | Consistent language/components with layouts adapted to each screen size |

Required design coverage includes mobile recording and library, web upload, processing, all three educational outputs, and assessment feedback. No login screen is needed for the initial prototype.

**Later:** browser microphone recording, accounts/profiles, social features, gamification, progress dashboards, flashcards, chatbot, advanced editing, decorative 3D elements, and elaborate animation. They should not consume first-version design time.

## 3. Information architecture and principal flows

Proposed navigation:

- **Library:** the starting point; primary action is Record lecture on mobile and Upload lecture on web.
- **Recording detail:** file identity, local/server state, and Process recording action.
- **Study workspace:** clearly separated Notes, Overview, Transcript, and Quiz views.
- **Quiz feedback:** score for the current attempt, explanations, source references, and Try again.

On a phone, the study views can use tabs or a compact section selector. On desktop, a side navigation and wider reading panel may work better. A student should always know which lecture is open and how to return to the library.

### Mobile flow to design

`Library → Record lecture → Recording ↔ Paused → Stop and save → Saved recording → Process recording → Processing → Study workspace → Quiz → Feedback`

Show microphone-denied, interrupted-recording, save-failure, offline-local-save, upload-failure, and processing-failure branches. The waveform must represent real incoming sound; Michelle designs how it looks, while Ben supplies the actual metering data.

### Web flow to design

`Library → Upload lecture → File review → Uploading → Uploaded recording → Process recording → Processing → Study workspace → Quiz → Feedback`

Provide both a drop area and a browse control. Selecting/uploading is separate from processing. A file picker must remain usable without drag and drop.

## 4. Required screen and state designs

Design the following matrix before polishing decorative elements. These views can be combined when navigation remains clear.

| View | Required states / content | Design review question |
| --- | --- | --- |
| Library | Empty, populated, local-only, uploaded, processing, ready, failed, backend unreachable; title/date/duration | Can a new student find Record/Upload and reopen an existing lecture? |
| Mobile recorder | Idle, requesting permission, recording, paused, saving, interrupted, error | Can the student tell whether audio is being captured and finish safely? |
| Web file selection | Empty drop area, drag-over, selected file, invalid type/size/duration, upload pending/failure | Can the student recover without losing the selected file? |
| Recording detail | Local versus shared server copy, Process action, upload requirement, deletion scopes | Is it clear what has been saved and what will be sent? |
| Processing | Uploading, queued, transcribing, analysing, generating, validating, ready, failed | Does the status explain real work without promising an invented time or percentage? |
| Notes | Headings, concise points, long content, lecture references, unavailable data | Can students scan and then read comfortably? |
| Overview | Subject, lecture description, topics, output language, actual classifier-source label | Is lecture identity distinct from the notes themselves? |
| Transcript | Long text, timestamps when available, Unicode/mixed-language content, selected reference | Can the student find the evidence behind a note or question? |
| Quiz | Unanswered/selected options, question progress, unanswered count, submission pending/error, insufficient-evidence state | Can students answer and submit without accidental double actions? |
| Feedback | Correct, incorrect, unanswered, explanation, lecture reference, actual score/count, new attempt | Does feedback explain the answer rather than only color it? |
| Deletion | Local-only removal versus uploaded data removal; cancel/confirm/failure | Does the student understand which copies and results are removed? |

Do not display every backend enum word in the interface. Turn it into understandable copy while preserving the distinction in state. Alex owns the state definitions; Ben maps them to the designed views.

## 5. Suggested visual system

These are starting suggestions for Michelle to explore, not approved visual decisions.

| Element | Proposed direction |
| --- | --- |
| Overall tone | Calm study workspace with strong readability and a clear primary action |
| Color | Light neutral background, dark text, one blue/teal action color; semantic red/amber/green used with text and icons |
| Typography | System-font family with verified Chinese/Malay glyph coverage; distinct page, section, body, and caption styles |
| Spacing | Small reusable scale such as 4, 8, 12, 16, 24, and 32 logical units |
| Components | Buttons, icon buttons with labels, recording indicator, waveform frame, session card/row, upload area, stage indicator, tabs, option card, feedback panel, reference link, confirmation dialog |
| Iconography | Consistent simple icons; familiar record/pause/stop actions accompanied by labels |
| Motion | Minimal feedback that clarifies state; respect reduced-motion preferences |
| Branding | Temporary text name and simple mark; no large illustration project before core screens are usable |

Suggested responsive review sizes are **360, 768, and 1280 logical pixels**. Use one-column reading and stacked controls on narrow screens; use extra desktop width for navigation or metadata while keeping note text comfortably readable. Record how controls wrap, how tabs overflow, and how long titles behave.

Use mock lecture content with realistic lengths, including long scientific terms, Chinese characters, Malay text, long filenames, a one-question quiz, and a five-question quiz. Designs should remain usable when the real response is longer or less tidy than the preferred example.

## 6. Accessibility and interaction quality targets

The following are proposed design-review targets, not a claim of certified conformance:

- Aim for 4.5:1 contrast for ordinary text and 3:1 for large text; verify the actual chosen color pairs.
- Aim for touch targets at least 44 × 44 logical units, including small recording and quiz controls.
- Do not communicate recording, failure, correctness, or selection through color alone. Include text/icon/state labels.
- Specify visible keyboard focus, sensible tab order, and keyboard operation for upload, tabs, options, dialogs, and submission on web.
- Give icon controls accessible names. Annotate announced recording/stage changes for Ben, with restraint so repeated updates do not overwhelm screen readers.
- Check larger text up to 200%, long text wrapping, and phone safe areas. Avoid tiny captions for duration or critical recording status.
- Make destructive actions easy to distinguish and provide a clear cancel path.
- Design persistent inline errors for important failures; a disappearing toast alone is insufficient when a recording or submission needs attention.
- Include empty states and recovery actions, rather than leaving a blank panel where data is missing.

Ben validates the implemented behavior with platform accessibility tools and the actual keyboard/device; a design annotation alone does not prove accessibility.

## 7. Content, trust, and educational feedback

Proposed student-facing labels:

| Situation | Example copy / intent |
| --- | --- |
| Recording | “Recording · 02:14” with a visible recording indicator |
| Paused | “Paused · Tap Stop and save to finish” |
| Saved locally | “Saved on this phone” |
| Uploaded | “Uploaded to the shared demo library” |
| Processing | “Transcribing audio,” “Preparing study materials,” and “Checking lecture references” for their actual stages |
| No network | “Recording can continue. Connect to process this lesson.” |
| Insufficient content | “There is not enough supported lesson content to create a quiz.” |
| Classifier provenance | “Subject: Science · Student model,” or the actual “AI baseline” / “Unclassified” source |
| Generated review material | “AI-generated study material. Check the lecture references.” |
| Saved demo example | “Previously generated example” |
| Quiz score | “3 of 5 correct on this quiz” rather than an unsupported overall mastery claim |

Use friendly language appropriate for students. Keep technical endpoint names, raw exception messages, provider keys, and internal IDs out of normal student flows. A small optional details panel can explain provider/model contributions for the demonstration; it must show the actual source rather than overstate student-model capabilities.

Before processing, provide a concise notice that audio is sent to ElevenLabs and transcript content to OpenAI. Match Alex's actual retention policy and avoid promising deletion from systems the app does not control. There is no login in the initial demo, so the interface must not imply each uploaded library is private to a signed-in student.

A quiz feedback panel should show the selected answer, correct answer, short explanation, and a link to supporting lecture text. Unanswered questions need their own label. A poor score should invite review or another attempt without shaming or making a diagnosis about the student.

## 8. Design deliverables and handoff to Ben

1. **Flow map and screen inventory:** mobile and web paths, plus error/recovery branches from section 4.
2. **Low-fidelity wireframes:** every required view; identify reusable components and the primary action.
3. **Design tokens:** agreed colors, typography, spacing, radii, icon style, and component sizing.
4. **Component/state sheet:** default, pressed, focused, selected, disabled, loading, empty, success, and error states where relevant.
5. **Detailed mobile and desktop layouts:** realistic populated content and representative narrow/wide behavior.
6. **Clickable walkthrough or annotated flow:** enough for a teammate to try the recording/upload-to-quiz journey; use the team's available design tool.
7. **Implementation annotations:** transitions, validation/error copy, responsiveness, labels, accessibility names, and any required behavior that is easy to miss.
8. **Design review log:** issues observed in Ben's working implementation, suggested fixes, and the verified outcome after revision.

Keep deliverables in a team-accessible form when implementation starts; do not make access to a paid design tool a blocker. A reference export or annotated image should accompany any tool-specific design link.

Ben first builds the basic functional recording and study flow. Michelle can begin flow analysis, wireframes, and tokens immediately, then redesign the functioning views. Ben implements the design; Michelle reviews it on the real phone/browser. If a redesign changes state behavior or payload requirements, agree it with Ben and Alex before treating it as required.

## 9. Delivery order and acceptance

Follow [the shared G0–G4 gates](ALEX_BACKEND_SPEC.md#9-shared-delivery-order-and-acceptance-gates); no calendar dates were established by the source.

| Gate | Michelle's contribution |
| --- | --- |
| G0 | Confirm student tasks, screen/state inventory, temporary naming, and early wireframes with Ben |
| G1 | Review the functional web baseline; ensure notes/overview/quiz are distinct and upload/process actions are understandable |
| G2 | Review the actual phone recorder, local-save state, pause/resume controls, and mobile reading/quiz flow |
| G3 | Check custom-model/fallback provenance and unknown-subject presentation without adding a new screen requirement |
| G4 | Final component/layout handoff, implemented design review, and a short usability rehearsal on both platforms |

### Design acceptance checklist

- [ ] Every required view and major error/recovery state has an agreed design.
- [ ] A teammate can find Record/Upload, recognize recording versus paused, save, process, read notes, take a quiz, and inspect feedback without coaching.
- [ ] Mobile and web use consistent terminology while adapting to their screen sizes.
- [ ] Local versus shared-server data and deletion scopes are understandable.
- [ ] Long/mixed-language content, empty results, insufficient quiz evidence, unknown subject, and fallback classification remain readable.
- [ ] Contrast, touch targets, focus, large text, accessible names, and reduced motion have been reviewed in the implemented interface.
- [ ] Ben has implemented the approved design, required controls still work, and critical usability issues have been resolved.
- [ ] Actual sample outputs and saved demo examples are labeled honestly.

For the rehearsal, ask at least a teammate who did not build the tested screen to complete both journeys. Record where they hesitate, misunderstand a status, lose an answer, or cannot recover. Revise those issues before polishing extra decoration. This small usability exercise supports interface improvement; it does not establish educational effectiveness.

## 10. Suggestions specific to the design work

Design the **results and quiz feedback** as carefully as the recorder. Recording is the entry point, but understandable notes, lesson references, and useful feedback make the educational value visible.

Give the recording controls and saved state the highest clarity, keep student-model provenance small but truthful, and use one consistent component set across both platforms. Spend the first review on whether students can finish the journey; reserve branding refinements and animations for after that works.
