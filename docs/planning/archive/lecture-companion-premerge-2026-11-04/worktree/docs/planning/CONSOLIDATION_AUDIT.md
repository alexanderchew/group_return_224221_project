# Source reconciliation and documentation audit

2026-11-04 · Documentation only. This file records what the specification uses and what remains unknown; it is not a second scope or implementation plan.

## Source access

| Source | Reviewed content and limits |
| --- | --- |
| Current supplied meeting | Recording/import, saved sessions, transcription, notes/meta/questions, subject classifier, end-to-end first, no-login demonstration, Ben/Alex/Michelle assignments and shared model work. User identifies participants as Steven, Alex and Ben; no exact speaker-number mapping is assumed. |
| Current direct request | Detailed specification for full implementation and identification of clarification points. This describes the requested documentation, not an instruction to bootstrap or code. |
| Later direct user correction | Explicitly replaces RiftTable AR as active project. Overrides the earlier short answer asking to keep a separate proposal. |
| Alex’s operating answers (U3) | User identifies himself as Alex; confirms iPhone + Android, typical 30–60-minute/maximum ten-hour audio, demo hosting/data on his current laptop, latest package intent, US$20 API ceiling and local terminal-script key entry. No credential value, machine inventory or implementation permission was supplied. |
| Attached shared-chat HTML | User-authored turns establish saved transcripts→own model/report intent, IGCSE preference, ElevenLabs, ten-hour upper limit, React Native interest and consideration of denoising/silence removal. Assistant text supplies exploratory dialogue/topic/syllabus architectures and examples; those are not approval or actual implementation. |
| Existing repository | Clean starting status; 20 Markdown documents with game planning and no application source. Existing root and active planning documents reviewed before replacement. All 20 preserved byte-for-byte in the archive, including the 11 old phase files. |
| Official sources below | Read-only technical feasibility research. No account, paid API, toolchain, mobile build, dataset or inference capability was tested. |

Attachment: [Pasted shared-chat HTML](</Users/alexanderchewtianyou/.codex/attachments/fffcd20c-e1f9-4b72-9c6a-6a63355e251e/Pasted text.txt>), SHA-256 `986efc4a8561a3181556d5d7811a68b9cd81971cdac1a82af96152cdd11bb5f9`. The path is a local provenance aid, not a portable repository asset. The HTML contains both user and assistant turns; assistant code/preset suggestions were not executed or accepted as verified examples.

## Reconciliation decisions

| Ambiguity or conflict | Treatment |
| --- | --- |
| Separate proposal versus replacement | Latest user correction controls: the study app replaces the game; historical game documents remain archived. |
| Old StudySmart cleanup versus new study app | New documentation is authored from this meeting/context; removed legacy notebook/README content is not restored. |
| “Full implementation” in the spec request | Document the whole intended product, including recovery/security/evaluation, without implementing it. |
| Meeting short-demo sequence versus ten-hour target | Alex confirms most audio is 30–60 min with ten-hour maximum. D0 stays short; F1 verifies normal sessions and maximum endurance on both mobile platforms. Local endurance need not spend API budget. |
| Mobile app and web version | iPhone/iOS + Android now confirmed by Alex; desktop web retained. Exact device/OS/browser inventory, recording behavior and framework adoption remain clarifications. |
| React Native question versus assistant architecture | Retain user interest; framework/backend choices are recommendations pending adoption, not user-approved stack. |
| Original audio classification wording | Meeting later clarifies the own model operates on the transcript. STT is external; subject inference is own trained model. |
| English/Malay/Chinese class examples | Distinguish a language taught as a subject from the language spoken during any subject. Freeze coherent labels before training. |
| Subject recognition versus dialogue/topic models | Subject classifier is first intended task. Richer attached assistant proposals remain optional, requiring data/evaluation gates. |
| No model yet but full workflow first | D0 permits visible disconnected mode; F1 requires real inference. Generic outputs in D0 do not establish ML completion. |
| “Meta” of the lecture | Proposed content overview with source evidence, separate from technical metadata and quiz-derived performance; Q06 remains open. |
| No login versus commercialization | Demo service/data now confirmed on Alex’s laptop; anonymous resource isolation remains required. Provider processing still sends relevant data to external APIs. Accounts/billing/public service are separate scope. |
| “Latest” packages | Confirmed intent, implemented as latest stable compatible versions resolved at setup and pinned for repeatable demos. No exact dependency versions have been installed/proven. |
| US$20 API budget | Record total combined demo allowance as the operating interpretation. Proposed shared reservations, US$16 warning and US$2 contingency are explicit defaults. Provider alerts alone do not manage cross-provider requests. |
| Terminal credential entry | Specify a no-echo launcher with backend process environment; do not create it, collect keys, write plaintext secrets or run paid validation in this documentation request. |
| Denoise/remove silence | Considered, not mandated. Preserve originals, compare derived versions and retain original-time mappings. |
| Presentation dates in assistant text | Not treated as a confirmed schedule. Teacher rules/deadlines and model sufficiency remain Q01. |
| Design and development | Functional interface first; Michelle changes appearance with behavior preserved. No assumption of an absent teammate's final commitment. |

## Official technical sources checked

These sources support constraints and candidate designs. Source pages/account policies can change; exact versions/models/limits must be rechecked at implementation and verified against the team's account. No provider performance or quota is inferred.

| Source | Supported point / implementation limit |
| --- | --- |
| [ElevenLabs transcription overview](https://elevenlabs.io/docs/overview/capabilities/speech-to-text) | Standard-mode long-input support and audio/timing capabilities; application capture/endurance remains independent. Mode-specific limits differ, so do not infer multichannel behavior from the standard duration ceiling. |
| [ElevenLabs create-transcript reference](https://elevenlabs.io/docs/api-reference/speech-to-text/convert) | Request/response boundary, word timing and optional asynchronous callback behavior. Provider/account settings and retention must be confirmed rather than assumed. |
| [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Schema-constrained output is a candidate for typed artifacts; refusals/incomplete results need handling, and schema validity does not establish factual correctness. |
| [TensorFlow text classification](https://www.tensorflow.org/tutorials/keras/text_classification) | Text vectorization/classification and matching training/serving preprocessing; not evidence of subject-classification accuracy or multilingual suitability. |
| [MDN MediaRecorder dataavailable](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event) | Event timing is not an exact audio clock; browser suspension/screen lock can alter delivery. Actual browser behavior must be tested. |
| [Expo Audio documentation](https://docs.expo.dev/versions/latest/sdk/audio/) | Native background recording involves explicit configuration/platform behavior; library support does not establish ten-hour battery, process-kill recovery or zero-gap rotation. |
| [Expo CLI package compatibility](https://docs.expo.dev/more/expo-cli/) | The chosen Expo/React Native version constrains compatible packages; latest-version intent is resolved as a compatible stable set, then pinned. |
| [OpenAI API authentication](https://developers.openai.com/api/reference/overview) | Keep API keys secret and provide them through backend environment/key management; terminal hidden-input/process-only behavior is this project’s launcher design. |
| [OpenAI spending controller](https://developers.openai.com/cookbook/articles/per_run_spending_controller_responses_api) | Conservative pre-request reservations, uncertain-cost retention and shared atomic accounting are relevant to the project’s cross-provider US$20 guard; provider billing tracking can lag. |
| [ElevenLabs API pricing](https://elevenlabs.io/pricing/api?price.section=speech_to_text) | Billing rates/add-ons/account terms must be checked when configuring conservative request estimates. No static price, promised number of recordings or account credits are assumed. |

The OpenAI Docs skill was used for the proposed API design. No external service was written to; only public documentation was read.

## Preservation and validation

Historical snapshots and their original-file SHA-256 values are listed in [ARCHIVE.md](archive/rifttable-ar-2026-11-04/ARCHIVE.md). The archive preserves the original relative tree; historical absolute attachment links remain local-only. Its AGENTS.md and phase instructions are source records, not active study-app instructions.

Final documentation checks cover active local links/anchors, balanced code fences, canonical requirement IDs and traceability, referenced decisions/questions/config packs, acyclic roadmap dependencies, archive hash equality, authorized Markdown-only changes and Git whitespace. Results belong in [PROGRESS.md](PROGRESS.md). No document validation is reported as a passing application/model/device test.
