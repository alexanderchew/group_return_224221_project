# PHASE-04 — Complete solo party raid

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S2 — Complete offline party encounter.

Intended outcome: A full five-role conventional-camera raid, with four bots, real movement/targeting, explicit preparation and recorded results.

Requirement references: R02, R04, R06–R14, R17, R23, R24, R26, R29; B01–B03; D03/D04/D10/D11.

Dependencies: P02.M03

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P02.M03. Adopt/version B01–B03 including threat, phases, movement and terminal ordering. Keep art simple and final model absent; label the scripted development policy.

## Scope and explicit non-goals

Concrete five-role mechanics, rule-based teammate policies, finite resources, movement, board formation, telegraphs, host-like solo authority and preparation-to-results flow.

Non-goals: No final ML model, AR integration, network clients, minions, save-game system, web spectator or complete visual replay.

## Expected deliverables and affected systems

Canonical five-role rules/configs and bots; headless full encounter; conventional-camera full-party scene; functional selection/movement/ability HUD; normal/demo configs and results.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P04.M01 — Tank/healer and common resource mechanics

Predecessors: P02.M03

- [ ] P04.M01.T01 — Implement Guardian and Priest active skills plus shared resource, shield, mitigation, threat and status rules using B01/B02.
- [ ] P04.M01.T02 — Define shield refresh/stacking, Silence eligibility, effective-heal threat and death/target edge cases; exercise them with concrete fixtures before any dataset generation.
- [ ] P04.M01.T03 — Add deterministic tank/healer bot commands with versioned priorities/reaction timing and the same validation path as human commands.

Acceptance: Tank/healer interactions, mana, shields, Taunt and interrupt eligibility have expected tested outcomes, including resource exhaustion and dead targets.

Verification: Core behavior tests and small conventional-camera inspection scenarios; no assertion that bots are balanced or final.

### P04.M02 — Damage roles and complete teammate policies

Predecessors: P04.M01

- [ ] P04.M02.T01 — Implement Ranger, Mage and Assassin basics/two skills with independent friendly/enemy selections and enemy-centered AoE.
- [ ] P04.M02.T02 — Add remaining teammate policies, shared legal-command handling and configurable evaluation profiles; record stable tie breaks rather than relying on collection iteration.
- [ ] P04.M02.T03 — Exercise all five human-role choices with four bots in bounded fixtures; record policy/config versions and meaningful resource/damage summaries.

Acceptance: All roles act legally and visibly; no unavailable third ability or fake cooldown; bots do not bypass rules.

Verification: Core and Unity tests for each ability's important effect/failure modes and a role-by-role manual interaction pass.

### P04.M03 — Movement and complete encounter contract

Predecessors: P04.M02

- [ ] P04.M03.T01 — Implement tap destination commands, bounded motion, manual priority, melee approach and deterministic boss-footprint avoidance; hero-hero collisions remain off.
- [ ] P04.M03.T02 — Implement phase gates, action scheduling, locked telegraphs, target rules, geometry, interruptions, timeout and terminal handling; test starting marks initially outside melee reach.
- [ ] P04.M03.T03 — Run complete five-hero scripted encounters under normal/demo configs and multiple bot/formation profiles; playtest counterplay and freeze the rules needed by data generation.

Acceptance: A five-role match completes with defined pacing/legality and movement counterplay; same-tick event order and every teacher-relevant observation source are stable/versioned.

Verification: Headless complete-episode tests, geometry/range boundary tests, manual dodge/interrupt demonstrations and canonical repeated-seed result comparisons. This core-contract gate can unlock 05 while M04 UI work finishes.

### P04.M04 — Preparation, two-ability HUD and results

Predecessors: P04.M03

- [ ] P04.M04.T01 — Implement role selection, one-to-one seeded formation preview, Ready/Cancel Ready, explicit Start Raid/countdown and restart; non-AR mode explicitly skips camera calibration rather than faking calibrated status.
- [ ] P04.M04.T02 — Invalidate readiness for relevant changes; lock formation/rules during countdown; keep UI events from generating unintended movement and show precise rejection reasons.
- [ ] P04.M04.T03 — Connect actual recorded damage/healing/mitigation/duration/outcome to results, local reset/settings and a simple first-use explanation; verify each human role can complete the full loop.

Acceptance: A player can choose any role, review/randomize formation, ready/start, play with four bots and inspect real results. All-ready alone never starts combat.

Verification: Unity transition/negative-input tests plus manual preparation → fight → result → retry flows, including all five role choices and repeated reset.

## Integration considerations and technical risks

M03 is the stable simulation gate for 05; M04 is additionally required before 06's learned playable integration. UI must not import training code or calculate outcomes. Use only concrete policy/adapter interfaces needed now.

## Objective acceptance criteria

All four milestones pass; five-role gameplay is genuinely usable and rules/policy versions are frozen for initial training. Headless fixtures and Unity use the same source.

## Testing and verification strategy

Established core and relevant Unity commands; test resources, targeting, movement, geometry, ready/start, and result accuracy. Playtest notes distinguish difficulty/fairness from successful code execution.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Select each role in turn, reshuffle before Ready, cancel readiness, start explicitly, move/dodge, heal from party rows, interrupt a cast, finish and retry. Inspect normal versus labeled judge config.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Authorized range includes 04 and adopted B01–B03. Completion requires full loop and tests. M03 alone permits canonical training work but does not mark the whole phase complete.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P04.M03 supplies stable state/features/bot rules to 05; P04.M04 supplies complete human UI flow to 06. Publish accepted rule IDs, bot versions, scenario seeds, tested terminal priority and known balance limitations.
