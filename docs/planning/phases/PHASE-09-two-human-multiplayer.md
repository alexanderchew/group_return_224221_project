# PHASE-09 — Two-human multiplayer

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S5 — Two-human cooperation.

Intended outcome: Two humans on iPhone/Android complete the same authoritative tabletop raid while three bot roles and failures remain controlled.

Requirement references: R03 subset, R06, R07, R13–R16, R18, R21, R22, R25–R29; D21/D22.

Dependencies: P08.M03, P03.M03

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

Accepted P0 baseline, passed P03.M03 connection probe and explicit P1 authorization. Freeze the actual venue/transport approach (LAN recommendation; Relay only if authorized/configured).

## Scope and explicit non-goals

Actual two-client ownership/authority, host lobby/readiness/countdown, state/event synchronization, snapshot reconnect, disconnect takeover and cross-platform shared-AR validation.

Non-goals: No mandatory minion, host migration, matchmaking/account platform, spectator, full replay, five-phone validation or video streaming. Local AR loss is not a network disconnect.

## Expected deliverables and affected systems

Network adapter over existing authority path, two-player lobby/role leases, versioned command/snapshot/event messages, synchronized telegraphs, recovery flow and Gate C/P1 release evidence.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P09.M01 — One simulation authority and two-client state

Predecessors: P08.M03, P03.M03

- [ ] P09.M01.T01 — Implement practical host/join connection and version/config handshake with stable five-slot identifiers, two human owners and three host-run bot controllers.
- [ ] P09.M01.T02 — Route ability/movement/target requests through ownership, phase, sequence, tick, range and resource validation; only host mutates combat and runs boss inference.
- [ ] P09.M01.T03 — Replicate authoritative snapshots/events with host clock, match/actor/decision IDs and local visual interpolation; test rejected stale/duplicate/unauthorized commands.

Acceptance: Two clients observe the same canonical results under a single model/bot authority; no client recomputes damage or shares raw AR origins.

Verification: Core/network integration tests and non-AR two-process inspection with induced delay/loss. The earlier counter probe is not enough.

### P09.M02 — Shared preparation and synchronized start

Predecessors: P09.M01

- [ ] P09.M02.T01 — Implement per-human hero/calibration/readiness, seeded host formation preview, changes invalidating readiness, roster/config revision lock and host-only Start.
- [ ] P09.M02.T02 — Schedule countdown/casts from one authoritative clock, cancel on defined missing readiness/disconnect and reject stale start requests; bots do not count as humans needing Ready.
- [ ] P09.M02.T03 — Demonstrate the same A–E assignment and state transitions from different physical viewpoints; local correction never becomes a networked arena transform.

Acceptance: Both players approve the same current formation and enter combat at the agreed tick; marker detection/all-ready do not start it.

Verification: Transition/race/negative-input tests plus two-phone lobby/countdown inspection, including reshuffle and disconnect while counting down.

### P09.M03 — Recovery and ownership transfer

Predecessors: P09.M02

- [ ] P09.M03.T01 — Define/version disconnect timeout, reconnect window and identity/role lease; transfer control at one tick so delayed human and bot commands cannot both execute.
- [ ] P09.M03.T02 — Implement full-snapshot reconnect for the same participant, deny unrelated mid-raid joins, and distinguish network recovery from tactical-view AR recovery.
- [ ] P09.M03.T03 — Handle host exit/suspension with a bounded documented timeout and clean session termination where authority cannot continue; implement host-only global pause and consistent tick-based timers.

Acceptance: A disconnected hero persists under one bot, reconnect returns one rightful controller, stale commands fail, and host loss is understandable without pretending migration.

Verification: Integration tests for lease/sequence/race cases and actual disconnect, app background/resume, host loss and pause runs. Client guesses never restore authority.

### P09.M04 — Complete cross-platform raid and P1 acceptance

Predecessors: P09.M03

- [ ] P09.M04.T01 — Complete full iPhone-host/Android-client and reversed-host raids where both platforms are approved hosts; measure synchronization/alignment and match final HP/outcome/formation logs.
- [ ] P09.M04.T02 — Repeat an intentional disconnect/reconnect and an AR-to-tactical transition during a cast/phase change; verify mode labels and the host's actual inference artifacts.
- [ ] P09.M04.T03 — Package Gate C evidence plus affected P0 regressions and P1 runbook; list tested count, devices, network, error budgets and limitations without claiming five physical players.

Acceptance: A full synchronized two-human encounter and controlled failure recovery pass on the actual network/devices; P1 acceptance is separate from P0.

Verification: Real two-phone runs, snapshot/event comparison, pairwise physical check points, current regression suites and venue rehearsal. A successful lobby connection does not pass.

## Integration considerations and technical risks

Maintain one simulation and a per-role control lease. AR transforms stay local; only board-local geometry and host timestamps travel. Host-model observations/logs are the source of analysis. No internet dependency is introduced into solo.

## Objective acceptance criteria

All four milestones and Gate C pass with device evidence, real ownership/race tests and complete raid outcomes. P1 can pass without minions or five human clients.

## Testing and verification strategy

Established suites plus actual NGO/Transport integration commands defined here after implementation. Use induced delay/disconnect tests and document fixture versus physical evidence separately.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Host/join, choose different roles, scan same mat, inspect/reshuffle, Ready/Start, cooperate through a full fight, lose one connection then rejoin, switch one phone to tactical view, pause as host, and demonstrate clean host loss.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Conditional phase: requires explicit P1 authorization, not automatic continuation from P0. Within authorized P1 work, milestones advance on evidence; no repeated approval for routine reversible fixes.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

P09.M04 unlocks 11 and multiplayer claims in 10. Provide protocol/ownership versions, actual network/device report, failure behavior/timeouts, host/client build hashes and known capacity limits.
