# PHASE-01 — Toolchain and project foundation

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S1 — Feasible platform and first playable loop.

Intended outcome: An approved game location and a clean, testable Unity/.NET foundation, preserving remaining planning/user work.

Requirement references: R13, R18, R22, R29; SRC-03 section 4; SRC-04 section 11; D01, D05–D08.

Dependencies: None (initial authorization and Q01/Q06 required).

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

Explicit implementation authorization for this phase; approved new-game destination (Q01). Q06 must adopt the initial toolchain direction within AGENTS-U's required C# core/adapter boundary; the entire later rule package need not be approved to establish this foundation. Do not infer permission to modify existing applications or use paid services.

## Scope and explicit non-goals

Locate or set up the selected desktop editor and .NET SDK after authorization; inventory mobile modules and compatible isolated Python for Phase 03 to establish. Create only the smallest new Unity/core/test scaffolding and command registry needed by subsequent slices. Full mobile/Python setup is not a prerequisite for this desktop foundation.

Non-goals: No gameplay, boss model training, AR game integration, networking product, art production or spectator code. Do not restore the legacy files removed under D27. A discovered command-line stub does not establish installed SDK readiness.

## Expected deliverables and affected systems

Proposed affected paths: RiftTableAR/Unity/, RiftTableAR/Simulation/Core/, RiftTableAR/Simulation/Tests/, isolated development environment definitions and setup notes. Pin actual versions after successful resolution, not before discovery.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P01.M01 — Approved location and usable toolchain

Predecessors: None (initial authorization and Q01/Q06 required).

- [ ] P01.M01.T01 — Record the user's approved root and authorization range; verify the current Git boundary/state and preserve remaining planning/user files.
- [ ] P01.M01.T02 — Locate or install the authorized desktop Unity/Hub editor and .NET SDK; record exact paths/versions. Inventory mobile/Python prerequisites for immediate parallel work in 03 rather than blocking the first desktop fight on full Xcode or Android setup.
- [ ] P01.M01.T03 — Record Q02/Q04/Q05 as answered or limited provisional work; select a coherent package set from official selected-version documentation and list remaining device prerequisites.

Acceptance: The new root is approved and isolated; desktop Unity/.NET executables are usable and mobile/Python readiness is explicitly inventoried. Missing desktop tools block this milestone; missing mobile/Python tools are carried into 03. Installation instructions alone do not pass.

Verification: Read-only version/path checks plus permitted setup logs; no game behavior is claimed. Stop dependent work if Unity or core build tools remain unavailable.

### P01.M02 — One shared core builds in Unity and headless .NET

Predecessors: P01.M01

- [ ] P01.M02.T01 — Create the minimal URP Unity project, empty conventional-camera inspection scene, one local pure-C# Runtime source package and separate .NET test project; keep Unity types out of shared source.
- [ ] P01.M02.T02 — Prove the same source is consumed by both environments using a small meaningful coordinate/tick fixture; pin Unity-compatible API/language settings and SDK independently.
- [ ] P01.M02.T03 — Establish nonempty discovered EditMode and headless test runs; register actual commands/paths in PLANS.md, capture compiler/test logs, and verify changes stay within authorized setup scope.

Acceptance: Clean Unity import/compile and headless build/test succeed with one authoritative core source, no duplicate copied rules, and documented rerun commands.

Verification: P-DOTNET and P-UNITY-EDIT are proposed until this milestone proves their actual form. A deliberate negative fixture must exercise rejection/failure reporting; empty test output cannot pass.

## Integration considerations and technical risks

Use a local package or equivalent source-sharing arrangement proven in both runtimes. Avoid latest-.NET-only APIs in shared code. Installation/signing/network access are real blockers, not reasons to generate a large uncompiled project.

## Objective acceptance criteria

Both build environments can load the minimal core and run discovered tests; there is a valid Unity scene and exact rerun instructions; remaining planning/user work is preserved. Device AR/inference proof belongs to 03.

## Testing and verification strategy

Inventory commands are confirmed in the planning record; game build/test commands are not. Establish their first working versions here and keep machine-local absolute paths out of portable source configuration.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Open the newly approved Unity project, inspect the conventional scene, run its minimal shared-core fixture, then run the headless fixture against the same source. Review Git changes to ensure isolation.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Initial user approval is mandatory. Within that approval, complete both milestones with actual build/test evidence. Do not advance on merely generated scaffolding; report unavailable tools as blockers.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P01.M02 unlocks 02 and 03 in parallel. Provide selected editor/package/Python/.NET versions, verified command registry, source-sharing diagram and remaining external/device blockers.
