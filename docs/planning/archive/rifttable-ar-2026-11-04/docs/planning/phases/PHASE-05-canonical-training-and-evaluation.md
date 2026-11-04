# PHASE-05 — Canonical training and evaluation

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S3 — Learned boss with inspectable evidence.

Intended outcome: A reproducible TensorFlow tactical artifact and honest comparison results generated from the canonical five-role simulator.

Requirement references: R05, R13, R19–R22, R26, R29; B05; D13–D17.

Dependencies: P04.M03, P03.M02

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

Stable P04.M03 simulation and P03.M02 runtime constraints; adopt/freeze B05 observation/action/teacher/config contract and resolve Q02 for final artifact selection. P04.M04 UI can finish in parallel.

## Scope and explicit non-goals

One persistent CLI/data source, exact observation extraction, teacher restricted to model observations, imitation training, exported-model parity and held-out complete-raid comparisons.

Non-goals: No second Python combat simulator, online learning, reinforcement learning, full replay, camera-image classifier, GPU/server dependency or fabricated research results.

## Expected deliverables and affected systems

SimCli NDJSON/batch interface, dataset/scenario/split manifests, isolated Python training/evaluation commands, float32 model/metadata, golden inputs/outputs and machine-readable results/figures.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P05.M01 — Versioned observation, teacher and process contract

Predecessors: P04.M03, P03.M02

- [ ] P05.M01.T01 — Implement the 32-feature/five-action schema with exact ordering, normalization, zero/dead/missing-target cases and masks; expose teacher only to observation/mask.
- [ ] P05.M01.T02 — Implement persistent NDJSON reset/step/observation/action/result with IDs/ticks, schema validation, stdout protocol separation, stale-response rejection and batch generation.
- [ ] P05.M01.T03 — Define executable data/evaluation commands, episode/scenario grouping and artifact manifests; verify CLI and Unity feature extraction on identical states without duplicating rules.

Acceptance: The canonical process runs complete seeded episodes and emits valid matching observations/labels; restricted teacher API cannot access hidden state.

Verification: Core/CLI schema tests, golden observation parity, malformed/stale message tests and bounded batch runs. Exact CLI invocations become registered commands only after they work.

### P05.M02 — Real training, export and compatible manifest

Predecessors: P05.M01

- [ ] P05.M02.T01 — Generate actual canonical normal/judge episodes across formation/bot profiles; separate complete episode/scenario groups into train/validation/test and freeze held-out IDs.
- [ ] P05.M02.T02 — Train a compact TensorFlow/Keras classifier, save actual history and dataset metadata; export a float32 .tflite and manifest binding model/rules/schema/teacher/bot/target/config versions.
- [ ] P05.M02.T03 — Compare TensorFlow/exported outputs on golden observations, including boundaries and masked choices; report tolerances and near-tie disagreements without replacing measured values.

Acceptance: A reproducible nonempty dataset and actually trained artifact exist; export parity and supported configuration/version checks pass.

Verification: Established P-PYTEST plus documented training/export commands and real reports. Class-label accuracy is imitation fidelity, not a gameplay-quality claim.

### P05.M03 — Held-out complete-episode evaluation

Predecessors: P05.M02

- [ ] P05.M03.T01 — Use Python model predictions through the same persistent canonical simulator; compare legal random, fixed script, teacher and trained policies using matched scenario manifests.
- [ ] P05.M03.T02 — Report actual sample counts, uncertainty, win rate, duration, legal/wasted actions and profile/config generalization; target 200 paired episodes per main comparison if feasible and explain any smaller run.
- [ ] P05.M03.T03 — Save reproducible configurations, model card, raw machine-readable summaries and readable figures; record negative findings and pending human fairness/playtest limits.

Acceptance: Evaluation can be rerun from documented artifacts/commands, includes the teacher, and contains no hidden rule changes or unsupported superiority claims.

Verification: Headless complete-raid runs with held-out scenarios; check episode grouping and policy isolation. A model is allowed to perform worse than its teacher; fabricated results or unevaluated configs cannot pass.

## Integration considerations and technical risks

Keep CLI/runtime vectors identical to the Unity contract and reject incompatible manifests. Normal/demo configurations are evaluated separately. P0 minion count is zero; a future nonzero feature distribution requires 10 revalidation. No Python reimplementation of combat.

## Objective acceptance criteria

M01–M03 evidence exists with exact versions, seeds, counts, hashes and rerun commands; exported model fits the runtime already proven in 03. No live Unity boss-control claim yet.

## Testing and verification strategy

Core/CLI tests, P-PYTEST, actual training/export/evaluation invocations defined here. Use deterministic teacher selection/tie breaks and recorded accepted actions for debugging; do not promise cross-runtime bit-identical inference.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Inspect one episode's observation/teacher/action trace, rerun a small evaluation subset from its manifest, compare a golden TensorFlow/exported output and explain one actual result/limitation.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Authorization covers 05, predecessors pass, and adopted contracts are stable. Training files existing without actual execution does not pass. Q02 unresolved means final compliance/artifact gate remains open.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P05.M03 unlocks 06 with model, manifest, golden arrays, inference constraints, evaluation artifacts and actual result limitations. Never hand off the tiny probe artifact as the final tactical model.
