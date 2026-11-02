# PHASE-10 — Enemy-count expansion

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S6 — Remaining original capacity.

Intended outcome: Extend the one-boss encounter toward the original maximum of three enemies without invalidating solo/network/model evidence.

Requirement references: R04, R11–R13, R19–R22, R24–R26, R28, R29; D23; conditional minion scope.

Dependencies: P08.M03

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P08.M03, explicit minion authorization and chosen one-versus-two cap/config. P09.M04 is additionally required before making multiplayer-minion claims; single-player expansion need not wait for 09.

## Scope and explicit non-goals

M01 introduces at most one optional minion. M02 adds a second only under separately included authorization. Reuse established training/evaluation tooling and revalidate every shipped config.

Non-goals: No new boss, arena, hero role, model action such as Summon, visual replay or advanced learning. Original target cap stays three total enemies; no implicit minion dependency for base P1.

## Expected deliverables and affected systems

Versioned minion rules/policy/spawn config and assets, enemy target UI, tested maximum counts, expanded scenarios/model compatibility and enabled-scope evidence.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P10.M01 — One optional minion encounter

Predecessors: P08.M03

- [ ] P10.M01.T01 — Implement one minion with explicit HP/speed/range/attack cadence, deterministic nearest-living-target behavior and common validation; choose/pin B01-derived values in the expansion config.
- [ ] P10.M01.T02 — Spawn once at the adopted 50% boss transition, maximum one living minion; handle death/IDs/target invalidation and boss-death victory even if the minion survives.
- [ ] P10.M01.T03 — Extend UI/events/headless scenarios and complete a minion-enabled solo raid, retaining the no-minion release config independently.

Acceptance: Authorized one-minion configuration never exceeds two total enemies, preserves targeting/terminal rules and completes a real encounter.

Verification: Core spawn/death/count/target boundary tests and conventional/mobile solo run; no model-quality claim from newly nonzero count input before M03.

### P10.M02 — Conditional second minion

Predecessors: P10.M01

- [ ] P10.M02.T01 — Activate only if two-minion scope is approved; define a distinct versioned spawn rule and maximum-two-live invariant rather than changing the one-minion config silently.
- [ ] P10.M02.T02 — Test simultaneous spawn/death, crossed thresholds, resets, area attacks and stable actor IDs with no more than three total enemies.
- [ ] P10.M02.T03 — Review miniature readability, target selection and performance with the extra actor/effects before enabling the config outside experiments.

Acceptance: Approved two-minion config preserves the max-three envelope and readable control. Otherwise mark Not activated, not Passed.

Verification: Count/property/scenario tests and actual worst-case rendering/targeting inspection. No new model output is added merely because enemies increased.

### P10.M03 — Rules/model revalidation and enabled-scope release

Predecessors: P10.M01

Conditional predecessors: P10.M02 if two-minion scope is enabled; P09.M04 if multiplayer evidence is claimed.

- [ ] P10.M03.T01 — Generate canonical expanded examples and evaluate supported minion configurations; retrain if required, update compatible manifests, and repeat export/Unity parity.
- [ ] P10.M03.T02 — Compare teacher/script/random/model on new scenario distributions and report nonzero-minion feature behavior separately from original zero-minion P0.
- [ ] P10.M03.T03 — Run affected P0 and, if P09.M04 passed, actual two-human minion raids; package exact enabled caps/configs/artifacts and retain original validated builds.

Acceptance: Every enabled minion configuration has valid rules/model/evidence and appropriate device/network checks; no untested distribution is silently called supported.

Verification: Existing 05/06 pipelines run inside this phase; do not create a backward dependency by re-opening old phases as new prerequisites. Hardware/network evidence matches claimed scope.

## Integration considerations and technical risks

Same simulator, five action IDs and authoritative event path; minion spawning is scripted by approved phase/config, not an untrained new boss output. Version rules, bot profiles, normal/demo configs and artifact compatibility together.

## Objective acceptance criteria

M01 and M03 pass for one-minion scope; M02 also passes only if enabled. Cap/count, victory/death and model distribution changes are tested. Multiplayer claims additionally require P09.M04 and actual combined runs.

## Testing and verification strategy

Established combat/CLI/Python/Unity tests and device profiles; compare no-minion versus enabled configs, repeat resets across thresholds, and verify logs/model metadata retain exact encounter config.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Choose enabled minion config, cross spawn threshold, switch targets/use AoE, defeat minion and boss, inspect victory with surviving adds, review expanded-policy evidence, then launch original no-minion config unchanged.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Conditional expansion only. Approval for one minion is not approval for a second. Declining M02 does not fail the one-minion feature, but prevents max-three-enemy completion claims.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

Provide validated configs/count caps, artifacts/scenario IDs and device results. P11 only depends on this gate when its release claims those enemy configurations; O01 spectator remains separately unapproved.
