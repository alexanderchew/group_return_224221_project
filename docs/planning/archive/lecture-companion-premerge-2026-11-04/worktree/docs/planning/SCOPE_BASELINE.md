# Lecture Companion scope baseline

Version 0.2 · 2026-11-04 · Documentation for review; implementation not authorized.

This is the single owner of requirement status and proposed numerical defaults. [PROJECT_SPEC.md](../PROJECT_SPEC.md) explains behavior; [PLANS.md](../../PLANS.md) owns sequencing. Specialist specs elaborate these requirements without approving additional scope.

## Sources and precedence

| ID | Evidence | Authority and limits |
| --- | --- | --- |
| U1 | Current user request: write a detailed full implementation project specification from Steven/Alex/Ben's discussion and identify clarifications | Authorizes documentation; not application implementation |
| U2 | Later direct user correction: “replace rifttable ar. we have cleared the rofttable project.” | Supersedes the earlier answer to retain a separate proposal; study app is now active |
| U3 | Alex identifies himself and confirms iPhone + Android, typical 30–60-minute audio with a ten-hour maximum, hosting/storage on his current laptop, latest package versions, US$20 API budget, and terminal-script key entry | Confirmed constraints; total combined demo-budget interpretation and latest-stable-compatible/pinning semantics are documented engineering interpretations, not paid-call or implementation permission |
| M1 | Supplied meeting transcript | Team discussion: recording/import, notes/meta/quiz, API roles, no-login demo, work allocation, functional UI first; commercial deployment details remain unresolved |
| A1-U | User-authored turns in attached shared-chat HTML | Desired saved transcript and own model/report; IGCSE rather than Olympiad; ElevenLabs preference; ten-hour session upper limit; React Native question; consideration of denoising/silence removal |
| A1-A | Assistant-authored turns in that attachment | Suggestions only: dialogue labels, topic/syllabus models, framework architecture, dates, examples, and code; not approved requirements or executable source |
| T1 | Official technical sources in the source audit | Support feasibility/constraints, not local verification or scope approval |

Current explicit user decisions > meeting direction > compatible attached user preferences > proposed engineering defaults. No speaker-number-to-name mapping is asserted; the named assignments are explicit in the meeting. Attachment location/fingerprint is retained in the [audit](CONSOLIDATION_AUDIT.md).

## Requirements

Status `M`: explicit meeting direction, retained as intended behavior. `U`: direct current or attached user intent/preference. `P`: proposed engineering contract for adoption. `E`: optional extension requiring a separate decision. These statuses describe evidence, not implementation completion. D0 and F1 are proposed delivery gates rather than a separately approved schedule.

| ID | Requirement | Status / source | Delivery |
| --- | --- | --- | --- |
| LC-01 | Study app replaces RiftTable AR; retain historical documents without restoring legacy notebook | U / U2 | Documentation |
| LC-02 | Mobile capture: Start, Pause, Resume, Stop, live input indicator and elapsed time | M / M1 | D0 short slice; F1 reliability |
| LC-03 | Web recording and file import; desktop drag/drop plus accessible file picker | M / M1 | D0 |
| LC-04 | Saved multi-session library with date, duration, state, playback and deletion | M / M1; U / A1-U | D0 basic; F1 recovery |
| LC-05 | ElevenLabs transcription; saved timestamped transcript distinct from generated content | M / M1; U / A1-U | D0 |
| LC-06 | Generate structured lecture notes from the actual transcript | M / M1 | D0 |
| LC-07 | Generate a lecture “meta” overview; exact content defined as proposed in PROJECT_SPEC | M term / M1; P meaning | D0 |
| LC-08 | Generate transcript-grounded questions, accept answers and check correctness with explanations | M / M1 | D0 |
| LC-09 | Train and run the team's TensorFlow/Keras subject classifier on transcript text | M / M1 | F1; scaffold in D0 |
| LC-10 | Establish end-to-end functional pipeline before connecting the trained classifier | M / M1 | D0 → F1 |
| LC-11 | No account login for demonstration; anonymous workspace isolation is proposed security design | M / M1; P mechanism | D0/F1 |
| LC-12 | Ben frontend; Alex backend; Michelle visual design over an intact functional interface; shared ML work | M / M1 | All |
| LC-13 | Native mobile targets iPhone/iOS and Android; desktop web remains intended. Test actual devices on both mobile platforms; exact device/OS/browser versions remain to inventory. | U / U3; M web / M1 | D0/F1 |
| LC-14 | IGCSE audience and subjects, rather than Olympiad-specific analysis | U / A1-U | D0/F1; taxonomy Q04 |
| LC-15 | Typical sessions are 30–60 minutes; absolute upper limit is ten hours of recorded/imported audio. Preserve this full limit while prioritizing normal-duration usability. | U / U3, A1-U; P paused-time interpretation | D0 short slice; F1 normal + maximum |
| LC-16 | Consider denoising/silence removal; retain originals and use reversible derived processing | U consideration / A1-U; P method | F1 selectable; D0 off |
| LC-17 | React Native remains the mobile candidate; web React/backend Python remain proposed. Use latest stable compatible package releases at setup, recording and pinning resolved versions; no automatic demo upgrades. | U version policy / U3; P framework selection and compatibility mechanism | Q02/G1 before bootstrap |
| LC-18 | Resumable durable capture/upload, asynchronous jobs, partial results and bounded retries | P / reliability design | D0 basic; F1 complete |
| LC-19 | Source citations, output validation, transcript revisions and reproducible generation/quiz versions | P / learning integrity | D0/F1 |
| LC-20 | Explicit distinction between own-model inference, provider work, unavailable model and saved demo | P supporting M1 | D0/F1 |
| LC-21 | Demo server and saved data reside on Alex’s current laptop; combined API spending is controlled within US$20. Alex supplies provider keys through a local terminal launcher; keep keys backend-only and enforce workspace access, retention/deletion and usage limits. | U hosting/budget/key entry / U3; P controls | D0 private; F1 hardened |
| LC-22 | Reproducible held-out model evaluation and measured phone/browser/recovery evidence | P / acceptance design | F1 |
| LC-23 | Teacher/judge walkthrough and presentation evidence from actual product and ML artifacts | M / M1; P packaging | D0/F1 |
| LC-24 | Dialogue-function classification, topic prediction, concept selection or learned question selection | E / M1/A1-A exploration | After LC-09 evidence |
| LC-25 | Accounts, payments, public commercial deployment, account sync, dashboards, adaptive mastery or LMS integration | E / commercial ambition not scoped | Separate authorization |
| LC-26 | Optional syllabus mapping with board, code, year, tier and source-backed topic identifiers | E / A1-A; P metadata support | Only after Q04/Q12 |

## Proposed delivery boundaries

**D0: complete short demonstration.** A real short recording and a prepared audio file flow through upload, ElevenLabs, saved transcript, notes, overview, quiz and marking. Both functional phone and desktop interfaces use the same backend contract. The classifier may be disconnected, visibly so. D0 is not completion of LC-09/15/22 or a compliant final contest entry by itself.

**F1: full specified study prototype.** D0 plus real evaluated subject inference, session recovery, versioned evidence and outputs, access isolation/deletion, agreed native/browser verification, and the ten-hour target. Online processing is required; offline capture and already-downloaded content can work locally. Long-duration acceptance differs by native and web capture; unsupported background web behavior must be stated explicitly.

**Commercial expansion.** A possible product direction, not a commitment to billing, accounts, legal readiness, or public deployment. No schedule, price, revenue projection, or learning-outcome guarantee is established.

## Proposed configuration packs

Confirmed U3 choices are explicitly labeled below. Other numerical values and mechanisms are engineering proposals, not achieved metrics. Refer to these packs by ID; adoption/revision belongs in DECISIONS.md.

| Pack | Confirmed choices and proposed implementation semantics |
| --- | --- |
| CFG-01 Media | Confirmed: normal sessions 30–60 min; maximum session audio 36,000,000 ms. Proposed timing interpretation: exclude user-paused intervals; imported duration decoded server-side. Maximum input file/aggregate recorded bytes 2,000,000,000; reject larger input with a clear conversion path. Target native compressed mono capture around 64 kbit/s when supported. Durable capture checkpoints target 10 s; provider working chunks target 10 min with 2 s context overlap. Uploaded transport parts target 8 MiB and are independent of media chunks; all final parts verified by checksum. Warn at 90% duration/quota and finalize safely at the limit. |
| CFG-02 Content | Initial English interface; preserve original multilingual transcript. User-selectable output language from an agreed supported list; no auto-translation promise. Default quiz target 5 four-option MCQs, one correct option each; fewer valid questions or no quiz when source is insufficient. Optional short-answer marking is deferred. Lecture overview, notes and questions require source references. |
| CFG-03 ML | Start with 3–5 agreed subjects plus abstention. Proposed collection target: 20 independent lecture/source groups per subject, aiming for group-separated 70/15/15 train/validation/test partitions and at least 3 held-out groups per class; not a proof of adequacy. Initial release goals: macro-F1 ≥0.80 on all supported-subject test inputs including abstentions as misses; selective precision ≥0.90 at coverage ≥0.70; out-of-scope false acceptance ≤0.10 on a separate reviewed challenge set. Tune thresholds only on validation; final test remains untouched. Report group counts and uncertainty even if goals are missed. |
| CFG-04 Processing | One active pipeline per session revision; up to 2 concurrent provider jobs per workspace until budget permits more. Transient provider failures: at most 3 bounded retry attempts with backoff/jitter and Retry-After handling; ambiguous submissions reconciled before resubmission. UI job polling initially 2 s while visible, backing off when idle/offline. Maximum LLM context is configuration-driven and token-counted with reserved output allowance; no ten-hour single-prompt assumption. |
| CFG-05 Retention/access | Private demonstration workspace with secure anonymous capability; 7 days server retention from session creation proposed, visible expiry, deletion available earlier. Derived artifacts and audio on the laptop host share that server policy. Separate phone/browser local checkpoints/caches remain until explicit deletion/storage cleanup; disclose both stores. Content-free demo spending records survive study-data deletion so the allowance cannot reset. No automatic use of recordings for model training. Public commercial use requires revisiting authentication and retention. |
| CFG-06 Quality | Proposed screen/control response p95 <200 ms on named test devices; metadata API p95 <500 ms excluding uploads/provider jobs. Target healthy-network D0 processing ≤3 min for a 2-min sample; report observed timings and vendor effects. Target ≤10 s recoverable audio loss after abrupt process termination, subject to proven native recorder capability. No 10-hour or crash-loss guarantee is accepted until a measured real-time endurance run passes. |
| CFG-07 Demo host | Confirmed: Alex is the user/backend owner; his current laptop hosts the API, worker, database, original/derived audio, transcripts, outputs and models. Internet is needed only for external providers/document/package access; the app service is private/local, with iPhone and Android connecting over a trusted LAN/hotspot. Proposed implementation: SQLite plus private local files and one worker; exact laptop capacity and device/OS/browser matrix must be checked. No cloud hosting, public tunnel or router exposure is required. |
| CFG-08 Versions | Confirmed intent: latest package versions. Resolve latest stable compatible releases at implementation setup, verify platform/runtime compatibility and pin exact resolved versions in manifests/lockfiles. If Expo is adopted, its supported React/React Native set governs mobile compatibility; web may have a separate compatible React version. Use a current supported Python/Node runtime compatible with TensorFlow/native tooling. No prerelease/nightly or blind automatic upgrade during demo preparation. Actual resolved versions are recorded in G1, not invented during documentation. |
| CFG-09 API budget | Confirmed ceiling: US$20; operational interpretation: one total demo allowance shared by all workspaces, jobs and paid providers, not US$20 each or per month. Proposed guard: warn at US$16; retain a US$2 contingency, so new request reservation is admitted only if settled spend + outstanding/uncertain reservations + conservative next-request bound + contingency ≤ US$20. Reconcile actual usage; retain ambiguous reservations; check each retry/chunk. Ledger survives restart, session deletion and credential changes. No automatic replenishment/reset or provider-plan purchase; only Alex may revise allowance. Include any agreed new minimum purchase/fees in the same allowance; actual provider charges/rounding/taxes must be reconciled rather than claimed perfectly capped by estimates. |
| CFG-10 Terminal credentials | Confirmed interaction: Alex enters provider API keys through a script launched in the laptop terminal. Proposed launcher `scripts/start_demo.py` uses a no-echo prompt, injects `ELEVENLABS_API_KEY` and the selected LLM credential (`OPENAI_API_KEY` if OpenAI is used) into backend/API-worker process environment, and never prints or writes keys to disk by default. No browser/mobile/chat key entry, command-line key arguments, paid validation on startup or credentials in source/logs. Launcher is specified only; no script/key/service is created by this documentation update. |

Actual classifier thresholds, provider model IDs and bounded prices, supported codecs, exact device/OS/browser versions, disk reserve, workspace byte/day caps and generation-token bounds remain implementation configuration. Latest-package intent does not select the newest or most expensive API model; choose a model with acceptable quality and bounded cost within the same allowance. The latest-compatible version policy, local host, US$20 ceiling and terminal-entry interaction are decided; do not list them as unanswered. No unlimited default is permitted.
