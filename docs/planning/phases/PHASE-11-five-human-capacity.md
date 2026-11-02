# PHASE-11 — Five-human capacity

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S6 — Remaining original capacity.

Intended outcome: Validate the remaining original 3–5-human target with real ownership/input and appropriately bounded physical-device claims.

Requirement references: R02, R03, R06, R07, R13–R16, R18, R22, R25, R27–R29.

Dependencies: P09.M04

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P09.M04 plus explicit 3–5-human expansion authorization. Q05 must supply additional compatible devices/players for physical validation. P10.M03 required only for claims combining expanded enemies with five humans.

## Scope and explicit non-goals

Exercise the already five-slot architecture under additional simultaneous humans, role claims, countdown, commands, inference and recovery. Add only capacity-specific fixes and verification.

Non-goals: No new framework, transport rewrite, mandatory minions, matchmaking, host migration, web spectators, camera streaming or five-device claim based on simulated clients.

## Expected deliverables and affected systems

3/4/5-client test matrix, capacity/fairness fixes if needed, actual device/player evidence, updated capability report and release/runbook for validated counts.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P11.M01 — Automated 3–5 client ownership and synchronization

Predecessors: P09.M04

- [ ] P11.M01.T01 — Use available actual Unity client instances/test builds to establish 3, 4 and 5 connections; verify the tool's real supported instance count instead of assuming a helper provides five.
- [ ] P11.M01.T02 — Exercise simultaneous role claims, human/bot replacement, Ready changes, host starts, command load and disconnect/reconnect at every occupancy.
- [ ] P11.M01.T03 — Measure host-model/frame/network behavior and fix hardcoded two-player assumptions without changing authority or adding parallel simulations.

Acceptance: Five unique human-controller slots work under genuine protocol clients with consistent state/events and rejected duplicate ownership. Simulation/client test evidence is labeled accurately.

Verification: Established network suites plus complete non-AR multi-client encounters, race/sequence tests and host performance recording.

### P11.M02 — Physical 3–5 player/tabletop verification

Predecessors: P11.M01

- [ ] P11.M02.T01 — Inventory actual devices/OS and human operators; install matching builds/model/mat/config, then run supported 3/4/5-human combinations around one board.
- [ ] P11.M02.T02 — Measure individual/pairwise alignment, occlusion, simultaneous inputs, countdown, role clarity and thermal/connection behavior over complete raids.
- [ ] P11.M02.T03 — Exercise one disconnect and one local AR recovery while others continue; compare final authoritative outcomes and identify unsupported device/network combinations.

Acceptance: The tested human/device counts complete raids with correct roles/formation/state and adopted budgets. If devices are unavailable, this milestone remains blocked; do not turn a simulated-client result into physical proof.

Verification: Physical runs and measurement/report evidence. Partial 3/4-human success is recorded as that count, not five-human completion.

### P11.M03 — Capacity-specific release acceptance

Predecessors: P11.M02

Conditional predecessor: P10.M03 if minion-enabled capacity is claimed.

- [ ] P11.M03.T01 — Run affected P0/P1 regressions and capacity scenarios against pinned builds; include max-three-enemy combinations only if 10 is enabled and their combined tests pass.
- [ ] P11.M03.T02 — Update explicit supported-count/platform/network table, known limits, manifests, setup/recovery instructions and demonstration sequence.
- [ ] P11.M03.T03 — Audit original R03/R04 intent against actually supported combinations and report remaining exclusions; optional spectator/replay require their own future scope decision.

Acceptance: Full five-human claim has actual evidence; remaining enemy or device exclusions are named. Original target is not marked satisfied solely from architecture or tests with fewer participants.

Verification: Requirements-to-evidence inspection, actual release candidate reruns where changes occurred, and combined-case checks for every claimed configuration.

## Integration considerations and technical risks

One host and five role slots remain the design. Additional human input can change battle distributions and difficulty, so re-evaluate model/fairness using existing pipelines if behavior changes materially. Do not make P0/P1 acceptance depend retroactively on this later capacity.

## Objective acceptance criteria

Required milestones pass for each claimed count. Five-human physical capability stays unverified until M02 succeeds; minion-enabled capacity additionally requires validated combined configurations.

## Testing and verification strategy

Core, network, Unity and actual multi-device testing; report protocol-client versus physical-player counts, host platform, network conditions and config/model versions separately.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Five people claim different roles, scan the same mat, inspect assignment, ready/start together and complete the encounter; disconnect/recover one role and compare all screens/results. Repeat approved combined enemy scope only when available.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Conditional expansion authorization and actual device supply are required. An unavailable physical test is an open gate, not grounds for claiming completion. Routine fixes within approved scope need no new feature approval.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

Deliver tested capacity matrix, device/evidence reports, supported build/artifact set and remaining limitations. Do not begin spectator, full replay or advanced AI automatically.
