# Scope baseline and source reconciliation

Version: 0.2. As of 2026-11-02, Asia/Kuala_Lumpur. **Draft for user approval. Implementation authorization: none.**

Read [master roadmap](../../PLANS.md), [decisions](DECISIONS.md), [risks](RISKS_AND_GAPS.md), and [progress](PROGRESS.md) together. This file owns requirement wording, provenance, and proposed configuration; phase files own tasks, not alternative specifications.

The [README](../../README.md) is the high-level entry point; [PROJECT_SPEC.md](../PROJECT_SPEC.md) consolidates experience, classifications and proposed acceptance criteria. The [consolidation audit](CONSOLIDATION_AUDIT.md) records current source access and reconciliation. No specification update constitutes adoption of the P0/P1 split or B01–B05.

## Authority and approval status

Confirmed intent means a direct user statement or user-origin request, not that a proposed technical solution or delivery tier was approved. Most detailed designs arrived as pasted assistant-generated briefs offered for inspection, followed by assistant recommendations. No later user message explicitly adopted every numerical rule or the P0/P1/P2 split. PLAN-U and subsequent SPEC-U authorize documentation/consolidation only, with the separately authorized legacy cleanup under CLEANUP-U.

Priority: the current planning-only instruction; latest explicit user decisions; earlier compatible user intent; latest proposed resolution; earlier proposals only where not superseded. Proposed choices below make the roadmap executable on approval but remain identified as proposals. Do not construe continued discussion as approval of a spectator implementation or acceptance of its deferral.

## Source registry

The accessible conversation, four attachments and existing planning set were reviewed. The current pass also inspected local Git history and connected GitHub issue/PR search results; see the audit for exact boundaries. Several original assistant gap-analysis responses, including the response attributed below as CHAT-A, are not visible now; their retained details are inherited proposals, not independently reverified approval. Other chats, school rules, hardware inventories beyond reported ownership, and external game repositories were not supplied. If attachment paths cease to exist, the reconciled requirements and decision records below retain context; do not invent missing authority. Attachment links below are local-only provenance aids, not portable repository assets.

| Source | Contents / relevant references | Provenance |
| --- | --- | --- |
| SRC-01 | [Initial concept and proposal](</Users/alexanderchewtianyou/.codex/attachments/5befde94-58c0-4b5a-9b03-f167bece3cd7/Pasted text.txt>), lines 1–8 user-origin concept; remainder assistant proposal | Tabletop 3D AR; 1–5 humans; tank/healer/three damage roles; 1–3 enemies; TensorFlow; reported Mac/iPhone/Android |
| SRC-02 | [UI prompt](</Users/alexanderchewtianyou/.codex/attachments/dd67ca34-551b-4d08-9f49-0d468f7e2cb2/Pasted text.txt>), sections 7–11, 15–17, 22–32 | Proposed UI/AI Lab; earlier three-ability/3–5-minute variant |
| SRC-03 | [Engineering prompt](</Users/alexanderchewtianyou/.codex/attachments/5ace4b5c-e4f6-4cd8-be22-78d674e7e716/Pasted text.txt>), sections 4, 9–12, 19–20 | Proposed pure-C# core and stages; contains superseded auto-start wording |
| SRC-04 | [18-gap resolution](</Users/alexanderchewtianyou/.codex/attachments/b002cf0c-3ee0-463c-aa35-5e5abf89b5dc/Pasted text.txt>), sections 1–14 | Latest attached proposal: P0/P1/P2, 32 inputs, five outputs, NDJSON, numeric rules, mat, evidence gates |
| CHAT-U | Direct user: five physical marks/randomization; explicit start button to prevent unintended starts; TensorFlow reminder; 'might want' spectator screen and Three.js question | Start control is explicit; spectator remains exploratory |
| CHAT-A | Existing planning records attribute nine later assistant recommendations; original standalone response unavailable in current visible context | Retained timing, threat, geometry, targeting, recovery, phase split, compatibility and early probes are inherited unapproved proposals |
| PLAN-U | Current user planning request, sections 1–8 | Authorizes named Markdown files/read-only checks; prohibits code/dependency/test/deployment changes and requires stop for approval |
| AGENTS-U | User-supplied repository instructions before CLEANUP-U; future implementation rules | Explicit canonical C# core/adapters, local AR alignment and board-local authoritative state, TensorFlow training, seeded/versioned contracts and evidence requirements; does not adopt all proposed tiers/rule packs or authorize implementation |
| CLEANUP-U | Subsequent direct user instruction: 'get rid of the study smart files' | Explicitly authorizes deletion of the legacy notebook and README; does not authorize game implementation |
| SPEC-U | Subsequent direct user request: consolidate project context/specification, create root GitHub README, assess readiness; explicitly do not implement, commit or push | Authorizes new game README and supporting Markdown reconciliation, not game features or approval of proposed defaults |
| MERGE-U | Subsequent direct user instruction: 'merge the code' | Authorizes commit and local-main integration of the existing documentation/cleanup; does not adopt game defaults or authorize implementation, remote push or deployment |

Attachment SHA-256 fingerprints:

- SRC-01: `70aae47e714049f9187868900da20c3ba473d4071a51917d21fd8092328ee103`
- SRC-02: `f7ab2a965746ac513bdbec547fe6301dc4236f4a840e4be87124dc5c9e467eaa`
- SRC-03: `1100695284fd6e2be5fc206e2384e723111be624f80012bc18261e8e1e27a76e`
- SRC-04: `86552139f7a66a0c597fa4656d9c320223c76c8a0c334e157c6b631d0cbda77b`

## Requirement catalog

`C` = confirmed user intent/constraint. `P` = proposed baseline pending adoption. P0/P1/Later are recommended delivery tiers, not approved commitments. Full original intent remains distinct from the staged subset.

| ID | Requirement | Status / source | Planned tier |
| --- | --- | --- | --- |
| R01 | Simple 3D tabletop AR boss-raid experience | C, SRC-01 | P0 |
| R02 | Five complementary roles: tank, healer, three damage dealers | C, SRC-01 | P0 |
| R03 | Target supports one through five human players | C, SRC-01 | P0 solo; P1 two; later five |
| R04 | Enemy envelope of one through three computer-controlled enemies | C, SRC-01 | P0 one boss; later optional minions |
| R05 | Meaningful TensorFlow use in the game; proposed responsibility is boss tactics | C framework / P tactical implementation, SRC-01, SRC-02, SRC-04 | P0 |
| R06 | Five physical starting marks with randomized warrior arrangement | C intent, CHAT-U; fixed offsets and host mapping P | P0 |
| R07 | Explicit deliberate start; detecting a table/marker cannot start combat | C, CHAT-U | P0; host-only multiplayer |
| R08 | Exactly five heroes, with simple bots filling human vacancies | P, SRC-04 | P0 |
| R09 | Automatic attacks and two active abilities per hero | P, SRC-04, CHAT-A | P0 |
| R10 | Tap-to-move, manual movement priority, melee approach; marks are spawn positions | P, SRC-04, CHAT-A | P0 |
| R11 | Short fixed-location boss encounter; proposed normal/demo configs and two phases | P, SRC-04, CHAT-A | P0 |
| R12 | Deterministic resources, ranges, targeting, threat, shields, interrupts, death and terminal rules | P, SRC-04, CHAT-A | P0 |
| R13 | One Unity-independent C# combat core; AR/UI/network/render/inference adapters do not resolve combat; proposed fixed-tick simulation | C core/adapter constraint, AGENTS-U; P tick/details, SRC-03, SRC-04 | P0 |
| R14 | Explicit alignment/Ready/start/countdown; host permutation preserves ownership; changes invalidate approval | P details supporting C R06/R07, SRC-04 | P0; synchronized P1 |
| R15 | Local device AR alignment and canonical board-local network state; proposed shared measured image reference | C coordinate boundary, AGENTS-U; P anchoring mechanism supporting R01/R06, SRC-04 | P0; shared P1 |
| R16 | Tracking loss preserves match; tactical controls continue; recalibrate before AR return | P, SRC-04, CHAT-A | P0 |
| R17 | Offline conventional-camera gameplay without AR/cloud dependencies | P, SRC-03, SRC-04 | P0 |
| R18 | Tested iOS and Android builds on the reported phones | P platform commitment; ownership reported, models unknown, SRC-04 | P0 |
| R19 | Versioned 32-float observation / five-action policy; teacher sees identical observations; legal mask and deterministic targets | P, SRC-04 | P0 |
| R20 | Canonical dataset generation, episode-separated splits, teacher/random/script comparisons, export/runtime parity, measured results | P, SRC-04 | P0 |
| R21 | Real decision log and post-raid AI Lab with matched decision IDs and provenance | P, SRC-04 | P0 |
| R22 | Truthful implementation/evidence status, explicit inference runtime and labeled failures/fallback | C reporting constraint, PLAN-U; P game modes, SRC-04 | All |
| R23 | Mobile-safe, readable two-ability HUD, ally-row targeting, meaningful invalid-input/error states | P, SRC-02, SRC-04, CHAT-A | P0 |
| R24 | Simple coherent miniatures, telegraphs and action cues using original/appropriately licensed content | P, SRC-04 | P0 |
| R25 | Measured frame timing, inference latency, alignment and recovery against provisional budgets | P, SRC-04, CHAT-A | P0 onward |
| R26 | Local settings and bounded match/decision/evaluation evidence; reproducible reset | P, SRC-04 | P0 |
| R27 | Host chooses combat outcomes/boss decisions; proposed two-human play, validated commands, bot takeover, identity-based reconnect, defined host loss | C authority boundary, AGENTS-U; P staged subset/recovery of R03, SRC-04 | P1 |
| R28 | Reproducible build/install instructions, evidence package, timed judge walkthrough and labeled backup | P, SRC-04 | P0 onward |
| R29 | Preserve remaining documentation/user work; legacy removal and new game documentation explicitly authorized; game implementation only after approval | C, PLAN-U, CLEANUP-U, SPEC-U | All |

## Proposed delivery baseline

Confirmed MVP package: **not yet adopted**. Confirmed later-phase package: **none explicitly approved**. R03/R04 remain confirmed overall targets; their assignment to later phases is proposed scheduling. The user explicitly rejected auto-start; other exclusions below describe the recommended baseline unless a direct rejection is cited. Q01/Q06 and implementation authorization gate entry, not missing detail silently filled with assistant approval.

P0 is a real solo raid with four bots, one boss, actual model-driven choices, AR on each approved demonstration phone, explicit preparation/start, and non-AR fallback. Both mobile builds are required under this proposed platform commitment, but simultaneous two-phone play is not a P0 condition. P0 evidence gates are A (device AR/inference), B (AI validity), D (performance/recovery), E (rehearsal). P1 adds Gate C (full two-phone raid), not a new condition retroactively blocking P0.

One optional minion is separated from base two-human delivery. Additional minions and five humans extend the original target only when those branches are authorized and tested. A device/client capacity claim names the tested count and platforms; simulated clients are not physical five-phone validation.

## Proposed rule packs for adoption

All values in B01–B05 are starting configurations, not measured balance or confirmed user approval. Adopt or revise each pack before its consuming milestone; ordinary balance refinement within the adopted configuration remains versioned implementation work.

### B01 — Identity, content and encounter envelope

Working title RiftTable AR. Role names Guardian, Priest, Ranger, Mage, Assassin. Working boss Ashen Titan (names remain replaceable). Normal configuration: 6,500 boss HP / 180-second limit; separately labeled judge configuration: 3,000 HP / 90 seconds. Exactly five hero slots. P0 no minions; one minion conditional expansion first, at most two later, never more than three enemies total.

Hero starting values from SRC-04:

| Hero | HP | Basic attack | Active 1 | Active 2 |
| --- | --- | --- | --- | --- |
| Guardian | 180 | 8 damage / 1.5 s | Shield Bash: 28 damage, 8 s cooldown, eligible interrupt | Taunt: 15 s cooldown; basic targeting override and 25% mitigation for 4 s |
| Priest | 110 | 4 / 1.5 s | Heal: 45 HP, 20 mana, 5 s cooldown | Aegis: 45 shield, 25 mana, 12 s cooldown, 6 s duration |
| Ranger | 110 | 10 / 1.5 s | Precision Shot: 32 damage, 6 s cooldown | Volley: 18 damage per affected enemy, 12 s cooldown |
| Mage | 95 | 9 / 1.5 s | Fireball: 38 damage, 25 mana, 6 s cooldown | Arcane Burst: 35 area damage, 30 mana, 12 s cooldown |
| Assassin | 100 | 12 / 1.5 s | Shadow Strike: 35 damage, 6 s cooldown | Evasion: 70% mitigation, 3 s duration, 14 s cooldown |

Priest/Mage maximum mana 100; regeneration 3/4 per second. Healing caps at maximum HP. Mitigation precedes shield absorption, then HP loss. No random critical hits, random damage rolls, resurrection, gear or resistance systems in P0. Specify mitigation stacking, shield refresh, silence eligibility and zero-value cases in P04.M01 before dataset generation; these bounded rules are not a new discovery project.

### B02 — Boss timing, fairness, phases and threat

Fixed tick 50 ms. Proposed corrections from CHAT-A: Strike interval 2 s, first opportunity 2 s after combat starts; one action channel; 0.5 s recovery; no action while casting/recovering/dead/paused. No-legal-action means wait, not an illegal forced Strike. Cooldowns begin at cast/action start and are not refunded on interruption.

| Action ID | Action | Effect / warning / cooldown |
| --- | --- | --- |
| 0 | Strike | 12 damage to eligible primary target; whole-board reach with readable ranged effect |
| 1 | Cleave | 25 damage; locked 90-degree cone, 0.10 m reach; 1.5 s windup, 7 s cooldown |
| 2 | Ground Slam | 35 damage; locked 0.055 m radius circle; 2 s windup, 9 s cooldown |
| 3 | Silence | 10 damage and 2.5 s silence to living Priest; 1 s cast, 12 s cooldown |
| 4 | Fortify | Boss 30% incoming mitigation for 4 s; 18 s cooldown; instantaneous |

Cleave, Slam and Silence are interruptible; instant Strike/Fortify are not. Phase 1 above 50% boss HP permits 0–2; phase 2 at/below 50% additionally permits 3–4. Preserve already telegraphed attacks across a phase change unless interrupted or terminal; do not silently relocate their geometry. Deterministic target rules/ties must be frozen in P04.M02 and shared by all policies. Current recommendation: primary-threat direction for Cleave, high-coverage living-hero-centered circle for Slam, stable role-ID tie breaks. Targeting may use full state; the action-category teacher may not.

Guardian damage generates 3× threat; other damage 1×; effective healing 0.5×. Taunt lifts Guardian threat to at least highest current threat plus 10 and overrides basic targeting for 4 s. These corrections address the lower raw Guardian damage rate; validate rather than assert perfect tank balance.

Victory: boss HP zero. Defeat: all heroes dead or timeout. P02/P04 must define and test a single event/terminal priority, including same-tick boss death/party wipe/timeout, before claiming deterministic outcomes. Recommendation: boss death takes precedence within the terminal evaluation; no subsequent hostile effect after the terminal event. This event-order choice is a proposed default requiring explicit recording, not a fact from an approved earlier rule.

### B03 — Movement, input and preparation

Board 0.38 × 0.26 m. Hero speed 0.08 m/s; melee/ranged ranges 0.075/0.28 m; proposed hero radius 0.01 m. Hero-hero collision disabled for P0, boss footprint blocked. Define the boss footprint and deterministic route around it in P04.M02. Manual ground movement overrides melee approach until enemy engagement is requested again. Basic attacks may occur when an eligible target is in range; precise move/attack timing uses ticks, not animation callbacks.

Two independent selections: enemy and friendly ally. Enemy tap selects/engages; empty-ground tap moves; party-row tap selects friendly target. Volley/Arcane Burst center on selected enemy in P0, superseding free ground targeting to avoid gesture ambiguity. UI consumes touches before board hit tests. Telegraphed shapes include hitbox/range logic and must be escapable under declared reaction/input delay scenarios.

Preparation: menu/session → role → alignment confirmation → preview randomized A–E mapping → individual Ready → explicit host Start Raid → shared 3-second countdown → combat → results/analysis. Solo uses the same deliberate start. Explicitly selected non-AR presentation skips camera calibration and is labeled non-AR; it must not pretend AR alignment passed. Calibration is not readiness; all-ready only enables Start. Shuffle/layout changes invalidate all human readiness. Role changes invalidate affected readiness and any shared formation approval changed by them. Countdown locks roster/rules/layout; disconnect or sustained invalid required calibration cancels it. A newly detected marker never creates another match. Tiny tracking fluctuations use a tested debounce (SRC-04 suggests 5 s in lobby; validate rather than assume it is right for countdown safety).

### B04 — Physical board, recovery, UI and quality

Proposed A3 landscape 420 × 297 mm mat, central 150 × 150 mm distinctive asymmetric image at origin, X/Z tabletop, Y elevation, metres in logical board coordinates. Hero centers: A (-0.160,-0.090), B (-0.080,-0.110), C (0,-0.115), D (0.080,-0.110), E (0.160,-0.090); boss near (0,0.095). Check 100% print scale, margins and physical dimensions. This supersedes earlier 200 mm marker proposals only if adopted.

Image establishes a common reference; local tracked poses/anchors maintain each camera's board mapping. Marker out of view with valid world tracking continues; unreliable AR switches to tactical 3D with human controls; returning to AR requires alignment confirmation. Network disconnect, not AR loss alone, triggers bot takeover in multiplayer. Recalibration never changes authoritative entity coordinates. Local corrections are session-specific and rechecked after origin resets.

Proposed alignment gates: maximum 20 mm per-device error AND maximum 20 mm pairwise disagreement at known points; aim for 10 mm per device. Record centre, A–E, and boss/front-corner points across views and recovery. Limits are targets, not guarantees. Performance: median at least 30 FPS, inference p95 below 50 ms, report slow frames/stalls and warm-device behavior, not only averages. No fake measured results. If targets fail, change scope/budgets explicitly rather than silently passing.

Landscape safe-area HUD: compact boss/cast top centre; ally rows left; timer/connection/pause top right; target feedback bottom; two ability buttons bottom right; battlefield centre stays readable. Enemy HUD selection supplements tiny miniatures; friendly rows support healing. Target approximately 44 pt iOS / 48 dp Android minimum interactive areas, main labels 16–18 pt equivalent; test actual physical rendering and camera-background contrast. Full AI Lab after results; compact optional live indicator. Solo explicit pause; only host global multiplayer pause, stopping simulation/timers on the same tick. Full analysis during live multiplayer is read-only unless deliberately globally paused.

### B05 — Learning, artifact contract and evidence

Versioned input shape [1,32], float32: 27 state values plus 5 legal flags. Stable hero order: Guardian, Priest, Ranger, Mage, Assassin. Index contract from SRC-04: 0 boss HP fraction; 1 remaining-time fraction; 2–6 hero HP fractions; 7–11 alive flags; 12 Priest mana; 13 Mage mana; 14 aggregate shield /200 capped; 15 Heal ready; 16 Aegis ready; 17 Taunt active; 18 Taunt ready; 19 living-pair grouping within 0.075 m; 20 highest non-tank / highest living threat; 21–24 Cleave/Slam/Silence/Fortify ready; 25 minions/2; 26 mean living hero distance/0.4 capped; 27–31 legal mask in action-ID order. Define zero denominators, unavailable targets, readiness versus resources, and all normalization edge cases in P05.M01. Old 18-input models are incompatible.

Teacher action selection receives exactly observation plus mask; deterministic targeting may access full state. Initial compact MLP candidate 32→64 ReLU→32 ReLU→5 class scores. Train imitation with an appropriate classification loss; no claim of independently discovered superiority. Pure-C# simulator emits teacher examples and serves persistent versioned NDJSON reset/step/observation/action/result messages. Include match/request/decision IDs and expected tick, validate stale responses, and keep protocol output separate from diagnostic text. Python can return trained predictions for evaluation using the same simulator. This does not require embedding TensorFlow into the C# core.

Split by complete episodes/seeds and keep scenario families for generalization. Mix and separately report supported normal/judge configurations; declare bot profiles/formation/rules versions. Compare random legal, fixed script, teacher, and model under matched scenarios. Target 200 paired encounters per principal comparison where practical; report actual count and uncertainty, win rate, duration, wasted/illegal actions and pacing/fairness separately. Golden observations compare TensorFlow, float32 .tflite and selected Unity runtime; provisional max absolute error 0.001, report near-tie action disagreements explicitly. Use actual precision evidence to justify changes.

Model manifest binds hash, feature/action/normalization schema, teacher/bot/targeting/rules/config versions and validation records. Validate before startup. Competition mode blocks missing/incompatible artifacts; runtime fallback may continue but marks match Mixed Policy with start/end ticks and excludes it from pure-model metrics. Practice permits labeled scripted fallback; baseline mode is explicitly scripted. Wait when no action is legal. Logs use matching decision IDs for observations, raw outputs, mask, selection, actual execution/target, interruption, mode and latency. Persist accepted commands/ticks, initial formation/seed, config, outcome; cap logs and retain chosen evidence without collecting camera footage.

## Optional, deferred, excluded and superseded register

| ID | Idea | Status / consequence |
| --- | --- | --- |
| O01 | Spectator screen | User expressed interest, not commitment; defer implementation in proposed MVP. Unity spectator versus Three.js not approved. No viewer/bridge/server phase authorized; retain useful snapshot/event boundary only. |
| O02 | Full visual replay | Assistant-proposed later feature, unapproved. Decision logs and reproducible experiments are in proposed P0; no 3D replay UI/recorder beyond those needs. |
| O03 | Cloud anchors / movable independently tracked stickers | Explored alternative, excluded from proposed baseline. Fixed image/mat first; change requires explicit replan if passive markers forbidden. |
| O04 | Relay/join codes, host migration, advanced lobby | Relay optional, not required for solo/LAN. Host migration excluded from proposed first multiplayer scope; end cleanly on host loss. No pretend join-code UI. |
| O05 | Reinforcement learning, outcome-rollout learning, extra raids/gear/customization | Explored/deferred or not requested. Initial imitation pipeline only; no requirement to train teammate networks or infer from camera images. |

Explicitly rejected behavior: automatic combat on camera/marker detection (CHAT-U). Do not restore it. Superseded proposals for this approval draft: independent per-phone shuffles; free per-phone arena scaling/rotation after alignment; 18-input action schema; three-active-ability HUD; old Cleric/Sorcerer/Ancient Golem/RaidForge names; 3–5-minute encounter; always-legal Strike; P1 two-minion cap; mandatory P0 multiplayer gate; first hardware proof deferred to late schedule. Most of these were assistant design revisions, not separate user-approved requirements. Working combat uses conventional camera before AR; it is not being marketed as an AR-complete milestone.

## Remaining approval and external facts

User adoption is needed for staged delivery, new-game destination, B01–B05 defaults, and any expansion authorization. Exact contest TensorFlow runtime rule, printed-prop permission, submission/event dates, physical device models/OS and team capacity remain unknown. See Q01–Q06 and RSK01–RSK12 in [RISKS_AND_GAPS.md](RISKS_AND_GAPS.md). Do not treat the phrase 'no-hardware rule' in a pasted proposal as verified contest policy.
