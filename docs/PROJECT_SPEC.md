# RiftTable AR project specification

Version 0.2 · 2026-11-02 · Status: consolidated specification for review; implementation not authorized.

This document consolidates the experience and acceptance contract. [SCOPE_BASELINE.md](planning/SCOPE_BASELINE.md) owns requirement IDs, approval status, source authority, and numerical rule packs. [PLANS.md](../PLANS.md) owns execution order. [DECISIONS.md](planning/DECISIONS.md) retains rationale. The [consolidation audit](planning/CONSOLIDATION_AUDIT.md) records reviewed and unavailable evidence. This specification approves no proposal by restating it.

## 1. Project name and vision

**RiftTable AR** is the current proposed working title. Earlier RaidForge AR naming is historical, not a second product. Build a small fantasy raid visible as 3D miniatures on a physical table, suitable for explaining a meaningful TensorFlow application at a school AI contest (R01–R05).

The confirmed target is 1–5 human participants, a tank, healer and three damage roles, and 1–3 computer enemies. It is a boss-only encounter concept. A solo-first demonstration and the names Guardian, Priest, Ranger, Mage, Assassin and Ashen Titan are proposed refinements, not separately approved user requirements.

## 2. Concept, genre and audience

A real-time cooperative fantasy boss raid, with the solo case supported within the original intent. Intended users are school demonstration participants and observers/judges. Exact age rating, broad commercial audience, and accessibility certification are TBD. Warcraft is a reference for role cooperation; its characters, branding and assets are not project content.

## 3. Player experience and core loop

Confirmed constraints: five physical starting marks with randomized warrior arrangement (R06 intent); deliberate start, never automatic camera-triggered combat (R07).

Proposed complete sequence (R08–R17, R21–R23): choose a role/presentation → calibrate AR when selected → preview the A–E assignment → Ready → explicit Start Raid → 3-second countdown → combat → victory/defeat → results/AI Lab → reset/retry. Solo uses the same deliberate start, with bots controlling the other four heroes. A conventional-camera mode is explicitly labeled and skips AR calibration rather than faking success.

Marker detection creates a preview only. Alignment confirmation and all-ready events also cannot start combat. The proposed multiplayer host owns shuffle, countdown and start; ownership of a chosen hero is separate from its spawn position. A reshuffle clears readiness before anyone approves the changed formation.

## 4. Mechanics, rules, objectives and progression

The following are **proposed defaults pending Q06 adoption**. Exact values and unresolved edge rules are owned by [B01–B05](planning/SCOPE_BASELINE.md#proposed-rule-packs-for-adoption).

| System | Recommended contract |
| --- | --- |
| Party | Exactly five heroes; unoccupied human slots use rule-based bots through the same validated command path |
| Hero control | Automatic attacks; two active abilities; tap-to-move; separate friendly and enemy selections |
| Role identity | Guardian protects/interrupts, Priest heals/shields, Ranger and Mage use ranged damage, Assassin uses melee burst/defense |
| Resources | HP, mana where defined, cooldowns, mitigation, shields, threat, casts and interrupt eligibility |
| Boss | One stationary-location boss in P0; five tactical action categories: Strike, Cleave, Ground Slam, Silence, Fortify |
| Counterplay | Area warnings lock geometry at cast start; damage resolves from authoritative positions; defined interrupt windows |
| Phases | Additional actions at or below 50% boss HP; preserve already telegraphed geometry |
| Timing | 50 ms logical tick; declared action cadence/recovery; wait when no action is legal |
| End conditions | Boss defeated → victory; party wipe or timeout → defeat; same-tick priority must be frozen/tested before training |
| Encounter configurations | Proposed normal 180 seconds / 6,500 boss HP; separately labeled judge 90 seconds / 3,000 HP |

Damage, targeting, movement, bot delays, terminal ordering, shield refresh, mitigation stacking and legality must be deterministic under the adopted rules/configuration. Remaining bounded edge rules close in P02/P04 before dataset generation. Numerical balance is unvalidated. The physical marks are proposed spawn positions, not permanent movement constraints.

No progression system has been approved. Levels, loot, gear, inventory, campaign, resurrection and saved encounter resumption are outside the recommended P0. A result screen and retry are not persistent progression.

## 5. Functional scope and classifications

| Classification | Requirements / treatment |
| --- | --- |
| Confirmed intent relevant to MVP | R01 tabletop AR; R02 five roles; R05 TensorFlow; R06 marks/randomization; R07 explicit start. Placement into a precise approved MVP remains pending |
| Confirmed full target | R03 1–5 humans and R04 1–3 enemies. Solo-first, two-human next and capacity expansion are recommended delivery positions |
| Confirmed later-phase scope | No independently approved deferral package is evidenced. Do not call P1/P2 approved commitments |
| Proposed P0 functionality | R08–R26 and R28 as applicable to solo: full party/bots, abilities, movement, deterministic core, preparation, image-based AR, tactical recovery, offline 3D, both mobile platforms, learning/evaluation, AI Lab, mobile UI, local bounded records and demonstration evidence |
| Proposed later functionality | R27 two-human authority/recovery, then remaining R03/R04 capacities in separately activated phases |
| Explicitly rejected or removed | Automatic camera-triggered start; legacy StudySmart content removed under D27 |
| Optional/unapproved | O01 spectators/Three.js, O02 full visual replay, O03 alternative anchors/movable tracked stickers, O04 Relay/host migration/advanced lobby, O05 advanced learning/content/progression |
| Assumptions requiring adoption | Unity/package version selection beyond the required C# boundary; solo-first tiers; bots; B01–B05 including controls/numbers; printed mat; platform commitment; budgets; spectator deferral |

O03–O05 are exclusions from the recommended baseline, not evidence that the user rejected every possible future use. Account services, databases, cloud saves, camera-image ML and video streaming are not required by the available concept. Do not build them as implicit prerequisites.

The full R01–R29 requirement-to-phase mapping is maintained once in [PLANS.md](../PLANS.md#requirements-to-phase-traceability). R22 and R29 govern truthful reporting, preservation and authorization across all work.

## 6. UI, controls and interaction design

Recommended landscape, safe-area-aware HUD (R09/R10/R14/R23): boss HP/phase/cast at top centre; five ally rows at left; timer/status/pause at top right; selected-target feedback below; two ability buttons at bottom right; clear battlefield centre. Use icons/text with color cues, readable camera-feed panels, distinguishable role silhouettes and telegraph/action cues. The dark fantasy/gold visual treatment in SRC-02 is an art proposal, not approved pixel-perfect design.

UI receives touches before board hit tests. Tap an enemy to select/engage; tap empty valid arena ground to move; tap an ally row for healing/shield targeting. Proposed P0 hero area attacks centre on the selected enemy, resolving earlier ground-aiming ambiguity. Invalid use states explain cooldown, insufficient mana, range or invalid/dead target. No unavailable third button is implied.

Preparation supports Confirm Alignment, Rescan, Ready/Cancel Ready, formation inspection and explicit Start Raid. Start explains unmet prerequisites. Countdown locks roster/configuration/formation; disconnect or sustained invalid required calibration cancels it. Exact debounce is validated rather than assumed safe.

Required proposed recovery surfaces: camera permission denied, unsupported AR, missing marker, limited tracking, failed alignment, model missing/incompatible or failed inference. Multiplayer adds disconnect, host loss and reconnect failure. Each must provide a usable next action and accurate mode/status.

Solo pause stops the simulation explicitly. Multiplayer pause is a host action on the authority's tick; opening diagnostics does not silently pause everyone. Full AI Lab is primarily post-raid; any live display uses a labeled recorded snapshot with matched decision IDs.

## 7. States, persistence and data management

Separate match lifecycle, presentation/calibration, controller ownership and model mode. AR reacquisition changes the local presentation; it never resets combat, reshuffles heroes or creates another match.

| State axis | Proposed responsibilities |
| --- | --- |
| Match | Preparation, Ready, countdown, combat, explicitly paused, terminal result, reset |
| Presentation | Conventional 3D; scanning/preview; aligned AR; limited tracking; tactical recovery; re-confirmed AR |
| Controller | Human or bot for each stable hero; multiplayer transfer is authoritative and singular |
| AI mode | Validated learned model, intentionally scripted baseline, practice fallback, or labeled Mixed Policy/failure |

Local persistence is limited to settings, bounded decision/match records, chosen evaluation artifacts and version manifests (R26). A process exit ends a raid. Reconnecting to a living host later is distinct from a saved game.

Record match/rules/model IDs, seed, initial formation, configuration, accepted commands/ticks, observations, raw outputs, legal masks, selected/executed actions, targets, interruptions, mode intervals, latency and result. Cap retention; exact limits/serialization are implementation choices at the consuming milestone. Camera capture/upload is not part of the plan. Decision logs do not promise visual replay.

## 8. Multiplayer and shared physical reference

Original 1–5-human intent is confirmed; its transport and delivery tiers are not. Proposed P0 tests AR separately on each approved phone without requiring simultaneous cooperation. Proposed P1 uses two human phones and three bots; remaining capacity follows after actual device availability and explicit branch authorization (R03/R27).

Use one authoritative simulation and boss policy. Clients submit ownership-validated commands; the host publishes board-local snapshots/events. Phone-specific AR origins remain local. All devices use the same formation permutation and marker-to-board definition. A common image gives a reference, not perfect identical tracking estimates.

Recommended first connection is LAN with an actual host address. Netcode for GameObjects is a candidate; Relay/join codes are optional and require a real approved implementation. No fake room code flow is specified for solo.

Proposed recovery: preserve a disconnected hero, switch to one bot after a documented timeout, reconnect the rightful session identity from an authoritative snapshot, reject stale/duplicate input, and deny unrelated mid-raid joins for first multiplayer. End clearly if host authority cannot continue; host migration is unapproved. AR loss alone retains human control through tactical 3D and does not trigger network bot takeover.

## 9. Technical architecture and technology status

TensorFlow use and the canonical C# core/adapter boundaries are explicit constraints, including the user-supplied repository instructions (AGENTS-U). The instructions also require local device AR alignment, board-local network state, authoritative outcomes/boss decisions, seeded scenarios and versioned contracts. The detailed packaging, timing, training/evaluation and package choices below remain recommendations; there is no existing codebase or locked dependency set (R13/R15/R19/R20/R27; D05–D17/D30).

| Boundary | Contract |
| --- | --- |
| C# simulation core | No Unity/AR/network/inference types; fixed ticks, validated commands, state, geometry, targeting and combat outcomes |
| Unity presentation | Scene/rendering, conventional and AR cameras, UI/input adapters; reads canonical state/events |
| Inference adapter | Builds versioned observations, validates model outputs, masks actions and requests legal execution through the core |
| Headless simulator | Same core source, persistent versioned NDJSON reset/step/observation/action/results; batch data generation/evaluation |
| Python ML | TensorFlow/Keras training, export, parity checks, paired policy evaluation, manifests and figures |
| Later network adapter | Authority/ownership, commands, snapshots/events, reconnect; no second combat implementation |

Proposed candidates are Unity 6.3 LTS/URP, compatible AR Foundation/ARKit/ARCore packages, a Unity-compatible .NET Standard 2.1 core API surface and separately pinned CLI SDK. Sentis is a candidate mobile inference runtime; native LiteRT is an alternative if contest rules require it. Candidate package documentation is linked in [DECISIONS.md](planning/DECISIONS.md#technical-sources-checked-during-planning). Exact installed versions are TBD until P01/P03 verification. Blender is optional for custom content.

The proposed B05 learning contract is 32 normalized float32 values → five action scores, with five legal flags included in the input. The teacher selects actions using exactly the observation/mask visible to the model; deterministic targeting may inspect full state. Initial method is supervised imitation, not an assertion of learned superiority or reinforcement learning.

Split by episodes/seeds; compare random legal, fixed script, teacher and model under matched scenarios. Compare golden observations in TensorFlow, export and Unity runtime. Manifests bind model hash to observation/action/normalization/rules/config/teacher/bot/targeting versions. Startup in competition mode rejects missing/incompatible artifacts. Runtime fallback is visible, logged as mixed intervals and excluded from pure-model metrics. Scores are not automatically calibrated success probabilities or causal explanations.

## 10. Platforms, deployment and distribution

Reported available hardware: a Mac, an iPhone and an Android phone. Exact phones/OS/AR support/signing access are TBD. iOS and Android builds plus conventional macOS Editor gameplay are proposed delivery targets (R17/R18). Five-human proof needs additional devices; desktop/simulated clients do not substitute for physical validation.

Development build/install instructions, a final printable, versioned model/data manifests, evaluation reports and a timed walkthrough are proposed release deliverables (R28). Distribution route, signing identities, store publication, minimum OS versions and project license are TBD. App-store release is not an approved MVP requirement. No paid account or cloud infrastructure is authorized by these documents.

## 11. Non-functional requirements and constraints

All budgets below are proposed acceptance targets, not measured results (R24/R25).

| Concern | Target / constraint |
| --- | --- |
| Mobile performance | Median at least 30 FPS; report frame-time distribution, stalls and warm-device/thermal behavior |
| Inference | p95 below 50 ms for the proposed small model; record actual runtime/backend and failures |
| AR accuracy | Maximum 20 mm per-device error at known mat points; aim for 10 mm; pairwise maximum 20 mm when claiming shared-device alignment |
| Consistent scale/orientation | Measured print size and common board axes/offsets; no independent post-confirmation scaling/rotation |
| Input/readability | Provisional 44 pt iOS / 48 dp Android touch areas and 16–18 pt equivalent main labels; verify physical rendering, contrast and safe areas |
| Robustness | Defined reset, invalid-input, model-failure, origin-reset and network-loss behavior; no duplicate arena or false success state |
| Scientific integrity | Versioned artifacts, honest sample counts/uncertainty, no fabricated data or superiority claims; parity tolerance provisional 0.001 maximum absolute output difference, near-ties reported |
| Content | Coherent simple miniature cues, original/appropriately licensed assets, attribution retained |
| Scope and workflow | Documentation/cleanup commit and local merge authorized under MERGE-U; no game/dependency/test/deployment edits, pushes or external writes |

Offline play is the proposed P0 runtime goal after installation; development, package acquisition and mobile installation have separate prerequisites. No schedule or guaranteed tracking accuracy is asserted.

## 12. MVP deliverables and acceptance criteria

**Confirmed MVP package: pending Q06 adoption.** The table defines the recommended complete P0 for approval. The first desktop playable is an earlier engineering checkpoint, not this completed product. Acceptance remains conditional on adopting the associated proposals.

| Criterion | Required demonstration / evidence | Requirements / primary gate |
| --- | --- | --- |
| AC-P0-01 | One core builds/tests in Unity and .NET; both consume the same source; exact working commands are recorded | R13/R22; P01.M02 |
| AC-P0-02 | A player deliberately starts, uses an ability, reaches win/loss, and resets without duplicates; camera/all-ready events cannot trigger start | R07/R12/R17; P02.M02–M03 and P07.M02 |
| AC-P0-03 | Every role is playable with four legal bots; real two-ability effects, movement, resources, targeting, telegraphs and terminal behavior pass scenarios | R02/R08–R12/R23; P04.M01–M04 |
| AC-P0-04 | Five unique A–E assignments preserve hero ownership; physical preview, readiness invalidation and countdown reflect the current assignment | R06/R14/R15; P04.M04 and P07.M01–M02 |
| AC-P0-05 | Real trained artifact, canonical game-derived dataset, episode-held-out comparisons and reproducible export/runtime parity exist | R05/R19/R20; P03.M02/M04 and P05.M01–M03 |
| AC-P0-06 | A complete raid uses actual model decisions; manifest failures and runtime fallback are correctly blocked/labeled/logged | R05/R22; P06.M01–M02 |
| AC-P0-07 | An AI Lab entry links the same real observation, scores/mask, selected/executed action and artifact; evaluation displays actual results | R21/R26; P06.M03 |
| AC-P0-08 | Each approved phone separately completes the learned AR raid; marker accuracy/orientation measured; occlusion/reset preserves logical state and human tactical controls | R01/R15/R16/R18; P03.M04 and P07.M01–M03 |
| AC-P0-09 | The whole solo loop works in labeled conventional 3D without runtime AR/network dependency | R17; P04/P06 and P08.M01 |
| AC-P0-10 | Actual mobile performance/recovery pass adopted budgets, or release remains blocked with explicit failures | R24/R25; P08.M01 |
| AC-P0-11 | Documented fresh install, printable, model/evaluation provenance, repeatable reset and timed five-minute rehearsal pass; backup clearly labeled | R28; P08.M02–M03 |

P0 requires proposed evidence gates A/B/D/E: devices/model, AI validity, performance/recovery and rehearsal. Multiplayer gate C belongs to P1. Neither one/two-human success nor five simulated clients satisfies the full original five-human target. Readable source alone satisfies no gameplay or device gate.

## 13. Deferred features and roadmap

There is no new implementation schedule in this document. Reuse the existing dependency-aware [11-phase roadmap](../PLANS.md#phases-milestones-and-hard-dependencies) and phase-level milestone acceptance criteria.

Recommended order: foundation (01), first playable (02) alongside early device/runtime probes (03), full solo party (04), canonical training/evaluation (05), learned raid/analysis (06), integrated AR (07), measured release/rehearsal (08). After separate approval, two-human play (09), optional minion envelope (10), and physical 3–5-human capacity (11).

The earliest playable milestone is **P02.M02**. The first implementation milestone would be **P01.M01**, resolving location and establishing usable desktop Unity/.NET tooling. It cannot pass through documentation alone. After P01.M02, gameplay and feasibility probes can proceed independently. Full training waits for P04.M03 rules and P03.M02 runtime proof. Both-phone AR acceptance waits for P03.M04. See PLANS.md for all conditional edges and parallel work.

Spectator mode and Three.js remain an open interest (O01), with no approved technology, phase or bridge/server requirement. Full replay and advanced learning likewise require scope decisions before implementation planning expands.

## 14. Risks, dependencies, open questions and readiness

**Verdict: BLOCKED for implementation entry.** Documentation is coherent enough for review, but no approved location, adopted initial baseline or implementation authorization is evidenced. The current request explicitly forbids feature implementation. The tools required for actual builds also remain unavailable in the inspected locations.

| Decision / gap | When it must close |
| --- | --- |
| Q01: game subtree/repository destination | Before project bootstrap; recommended `RiftTableAR/` here remains unapproved |
| Q06: adopt/revise staged scope and relevant B01–B05 defaults | Initial toolchain direction within the required C# boundary before P01; combat subset before P02/P04; ML and quality packs before their consuming milestones |
| Explicit implementation authorization | Before any phase begins; can cover a bounded phase range |
| Q02: TensorFlow training versus required inference runtime | Before final runtime/artifact acceptance; explicitly provisional compatibility probes can proceed earlier if authorized |
| Q04/Q05: passive-marker permission, exact phones/OS/install access | Before compliant AR/device acceptance; five-phone supply before P11 physical claim |
| Q03: contest deadlines, deliverables, team availability | Before schedule promises/final competition packaging |
| License/distribution details | Before public distribution/release obligations; not a blocker for authorized local scaffolding |

Primary technical risks are absent toolchains, runtime/operation compatibility, AR accuracy/recovery, small-screen usability, simulation/training drift, leakage or misleading ML evidence, thermal stalls, and later network authority/recovery. The early probes in P03 reduce the expensive risks before final training/artwork. The detailed owners, mitigations and consuming gates remain in [RISKS_AND_GAPS.md](planning/RISKS_AND_GAPS.md).

Available original sources do not establish the exact contest rules/dates, a fully approved MVP, or unavailable assistant recommendations as user decisions. The [audit](planning/CONSOLIDATION_AUDIT.md#source-access-and-review-boundaries) makes these evidence limits explicit. After reviewing this baseline, authorize and resolve only the decisions needed for the selected first phase; dependent external answers need not block unrelated approved work. Planning completion is not coding approval.
