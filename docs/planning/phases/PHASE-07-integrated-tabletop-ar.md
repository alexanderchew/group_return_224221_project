# PHASE-07 — Integrated tabletop AR

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S4 — Single-player AR demonstration.

Intended outcome: The learned five-role raid works on the measured tabletop with usable phone controls and safe local tracking recovery.

Requirement references: R01, R06, R07, R10, R14–R18, R23–R25, R29; B03/B04; D09/D11/D12.

Dependencies: P06.M03, P03.M01

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P06.M03 learned loop and P03.M01 device/marker proof. Adopt final physical layout, budgets and UI defaults; Q04/Q05 resolved for contest/device acceptance. Recheck phone deployment if tooling changed.

## Scope and explicit non-goals

Final mat/marker assets and print sizing, full-game board-to-world mapping, explicit calibration, mobile controls/content and AR-to-tactical recovery on each target.

Non-goals: No physical sticker tracking, cloud anchors, per-phone independent board scaling, gameplay from raw camera motion, network sessions, spectator view or elaborate original character production.

## Expected deliverables and affected systems

Measured printable mat, final image library, local alignment adapter, integrated phone raid, tactical fallback and error states, coherent lightweight assets/UI and alignment/playtest reports.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P07.M01 — Final mat and board transform contract

Predecessors: P06.M03, P03.M01

- [ ] P07.M01.T01 — Create the original/appropriately licensed high-feature marker, A3 layout, ruler/100% print instructions and versioned A–E/boss coordinates; check real print dimensions and usable margins.
- [ ] P07.M01.T02 — Map tracked reference pose through a single calibrated board transform with explicit units/axes; render verification points at centre, A–E and boss/front corners.
- [ ] P07.M01.T03 — Test orientation, inverse input mapping, role permutation and version mismatch in code; measure individual alignment on both phones rather than relying on the temporary cube probe.

Acceptance: Final print and virtual positions agree within adopted per-device budgets, with correct axes and actual measurements from each phone.

Verification: Core transform/inverse/geometry tests plus real-device multi-point inspection at different angles/heights. Pure math success cannot prove tracking accuracy.

### P07.M02 — Learned raid in AR with controlled recovery

Predecessors: P07.M01

- [ ] P07.M02.T01 — Mount the existing complete learned raid under the local board root; calibration confirmation remains distinct from Ready and explicit start.
- [ ] P07.M02.T02 — Handle marker invisibility, world-tracking degradation and origin reset separately; keep match state and switch to tactical controls when AR is unreliable.
- [ ] P07.M02.T03 — Require verified local alignment before AR return; reconcile corrections without duplicate arenas, changed shared coordinates, lost hero ownership or restarted combat.

Acceptance: A full learned AR raid completes; temporary occlusion and origin-reset scenarios preserve logical state and human control. Camera acquisition/reacquisition never starts or duplicates a raid.

Verification: Unity state/adapter tests plus hardware interruption scenarios during windup, gameplay and results. Compare pre/post match/actor IDs and health/ticks.

### P07.M03 — Mobile interaction, readable content and playtest

Predecessors: P07.M02, P03.M04

- [ ] P07.M03.T01 — Finalize two-ability landscape HUD, ally/enemy targeting, UI hit priority and safe-area/error recovery views; inspect actual physical touch sizes, text and camera-background contrast.
- [ ] P07.M03.T02 — Replace only necessary primitives with coherent lightweight role/boss models and action/telegraph cues; record provenance and verify animation never controls damage timing.
- [ ] P07.M03.T03 — After P03.M04 passes, playtest each selectable role with four bots on both phones; record wrong taps, unclear counterplay, resource/aggro problems, frame spikes and adopted adjustments before model revalidation.

Acceptance: Phone controls support move/target/heal/interrupt and finish/retry; visuals are legible and all shipped actions have real effects. Rules changes have updated evaluation evidence.

Verification: Relevant core/Unity regressions, manual role coverage, actual unsupported/permission/error states, initial warm-device profiles and content/license inspection.

## Integration considerations and technical risks

World transforms and camera pose never alter damage/range/rules. Versioned mat calibration must match the same logical coordinates used in training and UI. Any mechanical balance change sends affected scenarios through the existing 05/06 validation tooling inside this phase, without introducing a dependency cycle.

## Objective acceptance criteria

Actual full mobile AR encounter and tactical fallback work on every adopted P0 platform; alignment/error/input evidence meets approved budgets or remains a declared blocker. No untested cross-platform claim.

## Testing and verification strategy

Established transform, input, Unity and artifact parity commands plus phone measurement/role playtests. Rendering readability, AR tracking and camera permissions require manual device evidence.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Launch to menu, choose role, scan/confirm, inspect randomized marks, Ready/Start/countdown, move/heal/use skills, obscure marker and simulate tracking reset, continue in tactical view, recalibrate, finish and inspect the same decision log.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Authorization includes 07 and adopted mat/UI budgets. Required device failures cannot be replaced by Editor proof; any platform reduction requires explicit scope revision.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P07.M03 unlocks 08. Provide exact mat/layout version, installed builds, device/OS matrix, alignment records, error/recovery walkthrough, final content provenance and any mechanically updated model/config evidence.
