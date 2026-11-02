# Context, scope and implementation-readiness audit

2026-11-02 · Documentation consolidation only. No game feature, test, dependency or infrastructure was created or executed. This audit supplements the [requirement baseline](SCOPE_BASELINE.md), [decision register](DECISIONS.md) and [master roadmap](../../PLANS.md); it does not replace them.

## Source access and review boundaries

| Source | Current review and limits |
| --- | --- |
| Visible conversation | Reviewed original concept/start/alignment/sticker discussion, requests to inspect the four attachments, spectator/Three.js interest, gap-analysis requests, planning mandate, explicit legacy cleanup and current consolidation request. Several earlier assistant responses to the tools/gaps questions are not present in the current visible transcript |
| SRC-01 | Available and fingerprint matches baseline. User-origin lines 1–8 establish tabletop AR, 1–5 humans, role composition, 1–3 enemies, reported hardware, TensorFlow and school AI contest; subsequent detailed solution is an assistant proposal |
| SRC-02 | Available and fingerprint matches. Direct TensorFlow reminder at lines 1–3; inspected UI, calibration/start, abilities, ML and AI Lab provisions. Three-button/3–5-minute recommendations conflict with later proposals |
| SRC-03 | Available and fingerprint matches. Reviewed architecture, combat/bots, marker/start, networking, ML/evaluation and milestone provisions. Embedded instructions to start coding were pasted for inspection and are superseded by direct planning-only instructions |
| SRC-04 | Available and fingerprint matches. Reviewed proposed tiers, lifecycle, numerical combat/ML contracts, AR, recovery, networking, analysis/logs, UI, evidence gates and unresolved facts. Its own text calls these recommendations; dates and a supposed no-hardware rule have no supplied primary confirmation |
| Existing planning set | Reviewed all 17 prior Markdown files: baseline, decisions, risks, progress, roadmap, AGENTS.md and all 11 phase files. These retain details from the earlier planning pass, but cannot independently prove an inaccessible user approval |
| AGENTS-U | User-supplied repository instructions explicitly constrain future code to a canonical C# core/adapters, local AR alignment, board-local authoritative state, TensorFlow training and seeded/versioned contracts. These constraints carry user authority even while broader defaults remain proposed |
| CHAT-A | The prior baseline attributes nine later assistant recommendations to this source. Their original standalone response is unavailable in the current visible context; timing/threat/geometry and gate corrections are retained as inherited, unapproved proposals, not newly verified conversation facts |
| Local repository/history | Inspected current file inventory, Git status, remote and all locally available commit summaries/stats. HEAD is `6aec1316072536314ca04477722d57abea34f7b7`; five commits concern the former StudySmart notebook/README. No historical game implementation is present in those commits |
| Connected GitHub | Read-only issue search for `repo:alexanderchew/group_return_224221_project is:issue` returned no results. PR search returned [merged PR #1](https://github.com/alexanderchew/group_return_224221_project/pull/1), titled Update README.md; metadata agrees with the local legacy README merge. These are bounded query results, not a claim to inspect inaccessible/deleted/private records elsewhere |
| Environment | Refreshed PATH/conventional-directory checks: no Unity/UnityHub/dotnet/adb found, no checked full Xcode/Unity editor/Android SDK directory; Python 3.14.7 and Mac arm64 observed. No full-disk scan or device inspection |
| Official technical docs | Rechecked candidate Unity package records, Sentis model-import documentation and TensorFlow Python compatibility. They support candidate investigation, not local build/model/device success; links remain in DECISIONS.md |

No other chats, unpublished decisions, teacher/contest rules, external game repository, phone inventory, actual game assets or implementation evidence were supplied or discovered. Do not claim complete access to all past conversations. Source attachment paths/fingerprints are retained in SCOPE_BASELINE.md; local attachment links are provenance aids and are not portable GitHub repository assets.

## Scope classification audit

The consolidation changes documentation access and clarity, not feature approval.

| Earlier item | Reconciled treatment | Authority / consequence |
| --- | --- | --- |
| Tabletop AR; five complementary roles; 1–5 humans; 1–3 enemies; TensorFlow | Confirmed overall intent | SRC-01 and TensorFlow reminder in SRC-02; R01–R05 |
| C# core/adapters, local AR alignment, board-local state and host authority previously labeled only proposed | Correct source authority: required boundary under user-supplied repository instructions; tick, image mechanism, CLI and recovery details still proposed | AGENTS-U / D30; R13/R15/R27 clarified without adopting the broader package |
| Physical marks and randomized arrangement | Confirmed desired capability; fixed measured offsets/host permutation remain proposed mechanism | CHAT-U / R06; B03/B04 pending |
| Camera points at table → fight begins | Explicitly rejected; keep explicit Start Raid | Direct user correction / R07/D02 overrides embedded earlier wording |
| All-ready → automatically start | Explicit start still required; readiness only enables Start in recommended flow | R07 plus proposed R14; misleading SRC-03 calibration sentence not carried forward |
| Five-player/max-three-enemy first delivery | Original target remains visible; P0 solo and staged expansion are proposals | D03; no silent five-player completion claim or approved deferral claim |
| P0/P1/P2 split; spectator deferred until after contest | Proposed sequencing only | SRC-04; no user adoption evidenced; Q06 |
| Three ability buttons / earlier abilities | Latest draft proposes two real buttons and B01 roles/skills | SRC-02 versus SRC-04; D04. This is proposal reconciliation, not a new approved game rule |
| RaidForge / Ancient Golem / Cleric / Sorcerer | Historical names retained as superseded draft terminology; RiftTable/modern role names provisional | B01 / D04 |
| 2–3 versus 3–5 minutes | Proposed normal 180-second and separate 90-second judge configurations | B01; no final balance/deadline implied |
| 18 features / earlier action labels / summon output | Proposed versioned 32-input, five-action contract; incompatible old model cannot be silently reused | B05 / D13 |
| Always-legal Strike | Inherited later proposal adds cadence/legality and wait behavior | CHAT-A provenance limitation; B02 / D10 needs adoption and tests |
| Damage-only threat and undefined target/geometry details | Inherited later corrections propose tank threat multiplier and deterministic locked geometry | B02/B03; validate before training, do not call observed balance |
| Free ground-targeted abilities | Inherited proposal uses enemy-centred hero area attacks in P0 | B03 / D11; input choice pending adoption |
| Central 200 mm marker versus 150 mm A3-mat proposal | Latest draft proposes B04 dimensions; older dimensions are not concurrently authoritative | Adoption and actual print measurement required |
| Independently align/scale/rotate/shuffle per phone | Proposed shared board contract with local alignment, one common assignment | R06/R15; no phone-specific game coordinates or independent shuffles |
| Tracking loss suspends all human input versus tactical recovery | Latest plan proposes tactical 3D retaining human control; calibration required for AR return | R16 / D12, still recommended behavior |
| Sentis called TensorFlow runtime | Corrected distinction: training/export and inference runtime recorded separately | Q02 / D14; contest wording remains unavailable |
| P0 completion requires simultaneous two-phone gameplay | Proposed gate correction: A/B/D/E for P0, C for P1 | D20; both standalone mobile builds still part of proposed P0 |
| One optional minion versus two in P1 | Separate first-minion and second-minion activation gates, independent of base two-human delivery | D23 / Phase 10; max three enemies remains original envelope |
| Three.js spectator question | Optional unapproved interest; no selected viewer, bridge, server or phase | O01 / D24; neither implementation nor deferral is silently approved |
| Full replay / reinforcement learning / host migration | Outside recommended initial delivery; unapproved options | O02/O04/O05; decision records preserved |
| Preserve StudySmart forever | Superseded by explicit cleanup D27; notebook remains deleted and old README content removed | CLEANUP-U; current README is a new game overview, not restoration of the legacy document |
| Pasted implementation prompts say start immediately | No coding authorization; direct current task explicitly forbids features | PLAN-U and SPEC-U take priority |
| November 17/19 / six-student allocation / no-hardware rule | Unverified proposal context, not schedule, team or contest policy | Q03/Q04; source confirmation required at affected gates |

## Requirements coverage

No requirement ID was removed or renamed, and no optional feature or delivery tier was promoted to approved. R13/R15/R27 now distinguish boundary constraints explicitly required by AGENTS-U from proposed mechanics, packaging or recovery details (D30); this corrects provenance rather than fabricating a new user decision. The [master traceability table](../../PLANS.md#requirements-to-phase-traceability) remains the single requirement-to-phase map.

| Coverage group | Requirements | Specification location / verification |
| --- | --- | --- |
| Concept and target capacity | R01–R05 | PROJECT_SPEC sections 1–5, 8, 12; P0 subset and original target explicitly separated |
| Physical preparation and start | R06/R07/R14/R15 | Sections 3, 6, 8, 11–12; negative start cases and measured transforms |
| Party and combat | R08–R13 | Sections 4, 6, 9, 12; canonical rules/playable scenarios before training |
| Recovery/platform/fallback | R16–R18 | Sections 7–8, 10–12; separate AR, non-AR and device gates |
| Learning and honest evidence | R19–R22 | Sections 7, 9, 12; parity, provenance, complete encounters and matched decision IDs |
| UI/content/quality/local data | R23–R26 | Sections 6–7, 11–12; physical phone playtests and measured budgets |
| Network and handoff | R27/R28 | Sections 8, 10, 12–13; conditional P1 and P0 packaging separated |
| Authorization/preservation | R29 | Every document; legacy cleanup and this documentation update are distinct from game work |
| Optional items | O01–O05 | Sections 5, 13 and scope register; no implementation phase silently added |

## Readiness assessment and decision timing

**BLOCKED for implementation entry.** The product intent is coherent and an executable conditional plan exists. However, Q01 location, relevant Q06 adoption and explicit implementation authorization are not evidenced; Unity/.NET builds are also not currently runnable in the inspected environment. Documentation completion cannot substitute for these facts.

After location and initial architecture adoption are recorded and Phase 01 is authorized, its toolchain establishment can begin. Do not demand every external answer before independent desktop foundation work. Q02 governs final mobile runtime/artifact acceptance; Q04/Q05 govern marker/device claims; Q03 governs schedule and contest packaging. Bounded rule edge cases close in P02/P04, before final data generation. License and public distribution are TBD before release obligations.

Recommended first milestone: **P01.M01 — Approved location and usable toolchain**. Its evidence is a recorded approved root/range, actual usable Unity/.NET executables, a coherent provisional package direction and an explicit mobile/Python readiness inventory. It produces no playable claim. **P01.M02** then proves shared source and nonempty tests. **P02.M02** is the first playable desktop fight; **P08.M03** is the proposed complete P0 gate.

Highest risks are unproven toolchains/mobile inference/AR, misleading AI evidence, missing combat edge rules, input usability, scope versus unknown capacity, and later network recovery. Preserve the early P03 feasibility branch, stable simulation/data contract and adapter boundaries; do not build spectator/cloud/replay infrastructure before a scope decision. No game test result or effort estimate is inferred from this audit.

## Documentation consistency and validation

The final documentation check covers repository/local Markdown targets and anchors, balanced fences, unique requirement/milestone/task IDs, phase prerequisites and conditional edges, an acyclic milestone dependency graph, requirement traceability, unchecked implementation tasks and absence of game source/manifests. It also checks that README, specification and roadmap agree on proposed P0, original capacity, no approved later tier, unapproved spectators and stopped implementation. Actual results are recorded in [PROGRESS.md](PROGRESS.md).

Preserve the existing decision and roadmap owners instead of creating duplicate docs/DECISIONS.md or docs/IMPLEMENTATION_PLAN.md. Future changes update the owned detail first and then the overview/acceptance links. No remote repository content, issue, PR, commit or branch is written by this task.
