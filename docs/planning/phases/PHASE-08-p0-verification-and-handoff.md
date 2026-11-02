# PHASE-08 — P0 verification and handoff

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S4 — Single-player AR demonstration.

Intended outcome: A reproducible solo AR release candidate with honest evidence, local/offline fallback and a rehearsed competition presentation.

Requirement references: R01, R02, R05–R09, R14–R26, R28, R29; D20/D26; P0 subset only.

Dependencies: P07.M03, P03.M04

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P07.M03 plus confirmed contest runtime/prop/deadline/deliverable rules and approved P0 platform/config/budget commitments. Q03 sets actual packaging deadlines, not invented estimates.

## Scope and explicit non-goals

P0 evidence gates A/B/D/E, final regression/playtest/performance checks, repeatable builds/installation, offline demonstration and practical handoff.

Non-goals: No requirement to pass multiplayer Gate C for P0; no new minions, viewer, replay, accounts, store publication, cloud deployment or feature expansion.

## Expected deliverables and affected systems

Pinned source/dependency/build instructions, approved phone builds, model/data/evaluation manifests, verification reports, printables, limitations and timed demo/reset/backup runbook. Builds/logs need not be committed to Git.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P08.M01 — P0 evidence and performance matrix

Predecessors: P07.M03, P03.M04

- [ ] P08.M01.T01 — Run applicable core/CLI/Python/Unity suites and full model parity/config checks against the release candidate; capture exact commands/test counts/hashes and supported-platform status.
- [ ] P08.M01.T02 — Complete normal and labeled judge encounters on both phones, measure individual/pairwise alignment without requiring network gameplay, cold/warm frame-time distributions, inference p95 and sustained behavior.
- [ ] P08.M01.T03 — Repeat at least three consecutive raid/reset cycles on each phone and exercise missing model, mixed fallback, denied camera, tracking loss and offline launch; record actual pass/fail against adopted budgets.

Acceptance: Gates A/B/D pass for adopted P0 targets or specific failures remain blockers. No claimed metrics are estimates; frame stalls and fallback intervals remain visible.

Verification: Automated regressions plus device matrix and instrumented profiles; distinguish warm/cold, render/inference timing and per-device versus pairwise alignment. Review recorded evidence against raw logs.

### P08.M02 — Packaging and timed judge walkthrough

Predecessors: P08.M01

- [ ] P08.M02.T01 — Document clean setup/build/install and signing validity/reinstallation steps; verify a rerun from pinned source and artifacts without relying on hidden local files.
- [ ] P08.M02.T02 — Prepare a concise approximately five-minute walkthrough using the separately labeled judge config, actual decisions and clearly identified saved evaluations; include mat setup, reset and local tactical fallback.
- [ ] P08.M02.T03 — Rehearse from app launch on intended presentation equipment, including offline conditions; prepare a clearly labeled local recording/replay of evidence as backup without claiming it is live or adding a replay feature.

Acceptance: A fresh install/setup can be followed and a timed rehearsal completes using actual game/AI evidence. Gate E passes; signing and device assumptions are written.

Verification: Independent follow-the-instructions inspection plus real timed rehearsal. External publication/upload/store submission is not implied by packaging.

### P08.M03 — P0 release decision and next-scope handoff

Predecessors: P08.M02

- [ ] P08.M03.T01 — Audit R01–R29 for the approved P0 subset and explicit conditional exclusions; ensure UI/README/demo labels distinguish solo, scripted development, learned and mixed modes.
- [ ] P08.M03.T02 — Record source/build/model/mat/config versions, remaining limitations, verification evidence and a reproducible reset/rollback-to-known-build procedure.
- [ ] P08.M03.T03 — Present P0 acceptance and recommended next phase to the user; activate 09/10/11 only if their scope is already explicitly authorized or newly approved.

Acceptance: P0 is called demonstration-ready only when its approved gates and deliverables pass. Five-human/two-phone gameplay and minion claims remain unmade unless separately verified.

Verification: Requirements-to-evidence review and actual release-candidate inspection; confirm no new feature work entered during final regression/rehearsal.

## Integration considerations and technical risks

Packaging references one coherent rules/model/build set. A speculative date is not a delivery promise. Platform or runtime failures require explicit changed scope, not relabeling a fallback as complete AR/ML.

## Objective acceptance criteria

Approved P0 A/B/D/E gates pass, reproducible artifacts/instructions exist, both target phones are verified and the timed run is repeatable. Gate C is intentionally excluded.

## Testing and verification strategy

Run established game test commands and all affected device scenarios once against the final candidate. Broaden/repeat only for changes, failures or unresolved concerns; do not run meaningless smoke checks instead of real gameplay.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Use only the runbook: launch, setup/scan, inspect formation, ready/start, demonstrate actual abilities/model decisions, finish, open matching analysis/results, reset, and explain saved evaluation versus live inference.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Authorization covers release preparation only, not external publishing. P0 can complete without 09. Acceptance evidence is required; user scope review does not replace missing measurements.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P08.M03 is the P0 baseline for conditional 09–11. Hand over tested artifacts/configs, actual capabilities/limitations, repeatable commands and device/runbook evidence; do not automatically start an expansion.
