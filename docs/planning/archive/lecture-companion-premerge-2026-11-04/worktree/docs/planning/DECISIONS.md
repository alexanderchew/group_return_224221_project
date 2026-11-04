# Lecture Companion decision register

2026-11-04 · [Scope authority](SCOPE_BASELINE.md) · [Clarifications](RISKS_AND_GAPS.md)

`Recorded` means explicit intent in the stated source; `Proposed` awaits adoption. This register contains no implementation approval.

| ID | Decision | State / rationale |
| --- | --- | --- |
| D01 | Make the lecture study app the active project and archive RiftTable AR documentation | Recorded current user correction U2; supersedes the earlier “separate proposal” answer |
| D02 | Keep the removed StudySmart notebook removed | Recorded repository instruction; this new app spec does not restore old code |
| D03 | Produce notes, lecture meta, and evaluation/questions from lesson audio | Recorded meeting direction; detailed meta fields remain proposed |
| D04 | Use ElevenLabs for transcription; LLM initially generates study artifacts | Recorded meeting direction; provider/model/account details still unverified |
| D05 | Train a subject classifier using transcript text with TensorFlow/Keras | Recorded meeting direction; subjects, data lead and contest sufficiency remain open |
| D06 | Complete the functional end-to-end path before classifier integration | Recorded meeting direction; disconnected classifier is disclosed, not credited as complete ML |
| D07 | Ben functional frontend, Alex backend, Michelle styling; model work shared | Recorded meeting allocation; user now confirms he is Alex. Confirm other teammates’ availability and shared ML lead. |
| D08 | Supply functional UI before visual redesign; retain all behavior during redesign | Recorded meeting direction |
| D09 | No account login for the demo | Recorded meeting assumption; no authorization to expose an unrestricted public backend |
| D10 | IGCSE focus, ElevenLabs; normal sessions 30–60 minutes with ten-hour maximum | Recorded attached intent and current Alex confirmation U3; board and recording recovery details remain open |
| D11 | React Native with TypeScript for native mobile, React web, Python FastAPI backend, server TensorFlow inference | Framework choices remain proposed; iPhone + Android and latest stable compatible package policy are confirmed under U3/D22/D24. |
| D12 | Python worker with persisted jobs; SQLite and private local files for a one-machine demonstration | Hosting/data on Alex’s current laptop now confirmed; SQLite/worker mechanism remains proposed. Cloud database/object storage is unnecessary for this demo. |
| D13 | Batch transcription after save/stop rather than realtime transcription | Proposed scope control; local input waveform is live, transcript generation need not be |
| D14 | Original audio immutable; mild denoising off by default; VAD navigation first; optional silence-trimmed derivatives with timestamp mapping | Proposed answer to the user's processing question; evaluate recognition accuracy before adoption |
| D15 | “Meta” means lecture content overview and revision guidance, separate from student performance | Proposed interpretation for Q06; no inference of intelligence, attention, emotion or mastery from audio |
| D16 | Start with deterministic MCQ scoring and source-grounded explanations | Proposed; avoids claiming reliable free-text semantic marking in the first release |
| D17 | Keep own-model prediction distinct from manual subject override or any LLM fallback | Proposed integrity contract; own model's held-out performance is measured before overrides |
| D18 | Anonymous per-install/workspace access with no cross-device sync by default | Proposed to reconcile no-login demo and private content; migration to accounts is separate scope |
| D19 | Ten-hour support is a full-product target, separate from a short judged demonstration | Proposed sequencing; keep LC-15 visible until endurance evidence exists |
| D20 | Topic/dialogue/syllabus/question-selection models follow measured baseline performance | Proposed expansion boundary; those models are not automatically required by pasted assistant content |
| D21 | New descriptive working title “IGCSE Lecture Companion” | Proposed placeholder; naming remains Q15 |
| D22 | Target both iPhone/iOS and Android devices | Confirmed U3; exact device/OS inventory and supported browser versions still require actual checks |
| D23 | Host the demo server and retain its data on Alex’s current laptop | Confirmed U3; clients connect to a private LAN/hotspot address, providers remain external internet dependencies; no public deployment required |
| D24 | Use latest package versions | Confirmed U3 intent; interpreted as latest stable compatible releases resolved at setup, pinned after verification. Exact versions await G1; prereleases/automatic demo upgrades are not implied. |
| D25 | Control API budget at US$20 | Confirmed U3; interpreted as total combined demo allowance. Proposed CFG-09 ledger/reservations/contingency control, including retries; no automatic refill or reset. |
| D26 | Alex supplies provider credentials through a terminal launcher on his laptop | Confirmed U3 interaction; no-echo prompts and process-only backend environment proposed. Script creation/key entry occurs during future authorized setup, not this documentation update. |

## Adoption and change procedure

Record the user's selected choice and date against its decision ID. For a behavior/default change, update the scope baseline, affected specialist contract, acceptance evidence and root roadmap dependency. Do not turn unanswered questions or passing documentation checks into adoption. Maintain separate data/model/prompt/API versions; changed classification labels invalidate incompatible models.

The latest request confirms identity/platform/duration/host/version/budget/key-entry choices and authorizes their documentation update only. Prior game commit/merge/push authorization is historical and does not carry into this new project's implementation or publication.
