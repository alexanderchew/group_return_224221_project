# PHASE-02 — First playable combat

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S1 — Feasible platform and first playable loop.

Intended outcome: The earliest runnable conventional-camera encounter: one controllable hero fights one boss, with deliberate start, victory/defeat and restart.

Requirement references: R07, R10, R12, R13, R17, R22, R29; B02 minimal subset; D02/D05/D10.

Dependencies: P01.M02

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P01.M02 verified. Adopt the small timing/terminal-order subset of B02/B03. Device/runtime spike 03 may proceed concurrently; it does not block this deliberately non-AR development slice.

## Scope and explicit non-goals

Build a minimal fixed-tick command/state/event loop and connect it end to end to a real Unity scene. Use a visibly development-only short encounter configuration, not pretend final balance or learned behavior.

Non-goals: No five-role party, final dataset, trained boss claim, AR, network sessions, progression, polished assets or full replay.

## Expected deliverables and affected systems

Core tick/clock/commands/terminal state, behavioral tests, minimal playable Unity scene/HUD, development rules configuration and repeatable reset.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P02.M01 — Bounded simulation loop and commands

Predecessors: P01.M02

- [ ] P02.M01.T01 — Implement hero/boss HP, automatic attack scheduling, one active ability, legal command checks, cooldowns and fixed simulation ticks; all outcomes remain in the core.
- [ ] P02.M01.T02 — Define start/pause/terminal/restart and same-tick event ordering; use a scripted development boss with the approved Strike timing and wait behavior.
- [ ] P02.M01.T03 — Test damage/healing bounds where present, no actions before start/after terminal, cooldown rejection and frame-rate-independent advancement.

Acceptance: A headless short scenario deterministically reaches victory or defeat under controlled commands, and invalid commands do not mutate state.

Verification: Run the established core command; verify explicit expected outcomes/event order under multiple render-step groupings. Seed repeatability alone is not the assertion.

### P02.M02 — Earliest playable desktop fight

Predecessors: P02.M01

- [ ] P02.M02.T01 — Connect a conventional camera, simple hero/boss visuals, health bars, Start Raid and one ability control to the canonical state/command/event loop.
- [ ] P02.M02.T02 — Implement actual win/lose feedback and a single restart path; show 'Scripted development boss' accurately until 06.
- [ ] P02.M02.T03 — Demonstrate a player-started fight, usable ability, visible damage and one complete outcome with no debugger intervention.

Acceptance: A person can launch the scene, deliberately start, use the ability and finish a fight. The scene is real, not a UI mock or automatic test playback.

Verification: Run relevant Unity PlayMode behavior tests and manual inspection. This is the roadmap's first playable milestone, not AR/ML completion.

### P02.M03 — Reset, rejection and stability checkpoint

Predecessors: P02.M02

- [ ] P02.M03.T01 — Add scenarios for repeated Start presses, cooldown spam, commands after death, invalid targets and boss/hero simultaneous terminal conditions.
- [ ] P02.M03.T02 — Verify restart clears tick, health, pending effects, cooldowns, commands and prior encounter events without duplicate actors/listeners.
- [ ] P02.M03.T03 — Record a short manual walkthrough, exact tests/counts and known intentional simplifications; preserve a runnable development scene.

Acceptance: Repeated encounter cycles and negative commands preserve defined rules and presentation. No source-only completion credit.

Verification: Run established core/EditMode/PlayMode checks appropriate to changed behavior; demonstrate both win and loss plus three consecutive resets.

## Integration considerations and technical risks

UI requests actions; it never directly changes HP. Animation completion cannot drive authoritative damage or cooldown timing. Keep the minimal interface concrete rather than implementing every proposed abstraction in advance.

## Objective acceptance criteria

P02.M02 manual fight and P02.M03 negative/reset scenarios pass. Development-only rules/policy are labeled and source-sharing remains intact.

## Testing and verification strategy

Use established P-DOTNET and relevant Unity commands from PLANS.md. Hardware, TensorFlow, AR and network verification remain unperformed at this gate.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Launch scene → observe idle HP → press Start → use ability → reach result → restart. Repeat with deliberate inactivity to show defeat and inspect absence of duplicate actors.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Requires authorization covering 02 and passed prerequisites. Complete after tests plus actual playable inspection, without waiting for final art or claiming final AI.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P02.M03 unlocks 04. Preserve commands/state/events, clock/terminal contract and the runnable minimal scene; share any changed common types with concurrent 03.
