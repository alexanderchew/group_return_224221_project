# PHASE-06 — Learned boss and AI analysis

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S3 — Learned boss with inspectable evidence.

Intended outcome: A real Unity raid controlled by the trained boss policy, with matched decision logs, truthful fallback behavior and post-raid analysis.

Requirement references: R05, R14, R17, R19–R22, R26, R29; B05; D14/D17–D19.

Dependencies: P05.M03, P03.M02, P04.M04

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

Verified model/evaluation P05.M03, actual runtime proof P03.M02 and complete human loop P04.M04. Q02 must be resolved for competition-mode compliance.

## Scope and explicit non-goals

Concrete model-inference adapter, decision-point scheduling, legal action validation, startup/runtime error policy, bounded logs and actual AI Lab/results integration.

Non-goals: No renderer-independent inference in the core, new learning method, speech/explanation generator, full visual replay, cloud evaluation service or network spectators.

## Expected deliverables and affected systems

Unity runtime adapter/resources, manifest validation, logged policy modes, golden-runtime parity, complete learned raid, compact live indicator and post-raid decision/model/evaluation view.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P06.M01 — Validated runtime adapter and decision records

Predecessors: P05.M03, P03.M02, P04.M04

- [ ] P06.M01.T01 — Load the final artifact using the P03-proven API, validate manifest/shapes/versions and own tensor/worker/disposal lifetimes.
- [ ] P06.M01.T02 — Run golden observations and compare actual Unity outputs/actions with P05 references; schedule only at legal decision points and stamp observation/response/execute ticks and IDs.
- [ ] P06.M01.T03 — Handle nonfinite/malformed/stale responses, paused/terminal state and changed legality at execution; record raw scores and actual masked/executed action separately.

Acceptance: The final artifact produces compatible real Unity outputs; invalid/stale decisions cannot bypass core legality or mutate terminal state.

Verification: P-UNITY-EDIT/PLAY golden tests as supported by the verified backend; CPU/headless tests do not replace phone backend proof.

### P06.M02 — Complete learned encounter and explicit failures

Predecessors: P06.M01

- [ ] P06.M02.T01 — Connect neural policy to the existing solo loop; leave boss damage, targeting and cooldowns in the core and preserve explicit preparation/start.
- [ ] P06.M02.T02 — Implement Competition/Practice/Baseline startup modes and logged mixed-policy intervals; no-legal-action waits without inventing an attack.
- [ ] P06.M02.T03 — Complete actual learned raids, inject missing/incompatible model and runtime failure paths, and repeat load/raid/reset cycles to inspect resource cleanup.

Acceptance: A human can complete a full fight with model-driven choices; startup/fallback labels reflect actual execution and mixed intervals are excluded from pure-model metrics.

Verification: Core adapter-boundary tests, Unity integration tests and manual failure injection. Repeat on the named mobile runtime/backend using probe knowledge.

### P06.M03 — AI Lab and artifact-to-match trace

Predecessors: P06.M02

- [ ] P06.M03.T01 — Persist bounded decision/match records tied to exact model/config/version; preserve actual accepted commands/formation/outcome without adding visual replay.
- [ ] P06.M03.T02 — Implement compact optional live mode/action/latency indicator and post-raid inputs/scores/mask/actual action/result for one matching decision ID.
- [ ] P06.M03.T03 — Display actual model/training/evaluation metadata and clearly label precomputed runs; implement solo pause/return and local settings/reset without a database or account system.

Acceptance: A presenter can trace one actual Unity action from its observation through scores/mask/execution, and inspect real held-out results without mismatched timestamps.

Verification: Record/serialization and UI integration tests; compare presented fields to raw logs and prove paused/terminal views do not invent fresh inference.

## Integration considerations and technical risks

Use the same authority path for scripted and neural policies. Async/readback latency cannot decide simulation time. Interface commands/actions, not animation events, drive combat. Model metadata names TensorFlow training and the actual runtime distinctly.

## Objective acceptance criteria

Full learned solo loop, logged error/fallback paths, numerical parity, meaningful analysis and bounded local data all pass; unsupported device/backend combinations remain explicit blockers.

## Testing and verification strategy

Established core/Python golden/Unity commands plus actual mobile runtime checks. Inspect inference allocations/readback spikes and repeated disposal; detailed performance acceptance belongs to 08.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Launch Competition mode with correct artifact, complete a fight, inspect a recorded decision. Repeat with missing artifact (blocked), Practice fallback (labeled), and injected mid-match failure (Mixed Policy). Return from analysis without resetting an active match accidentally.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Authorized 06 scope plus passed predecessors and runtime rule confirmation. A scripted fight or rendered chart alone cannot pass learned-boss acceptance.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P06.M03 unlocks 07. Provide final model/manifest/log schema, actual runtime results, working scene and analysis, error semantics and profile hooks for mobile AR integration.
