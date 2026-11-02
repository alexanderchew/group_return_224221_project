# PHASE-03 — Device and inference feasibility

Status: Not started. Implementation authorization: none in this planning turn.

Parent stage: S1 — Feasible platform and first playable loop.

Intended outcome: Early evidence that demonstration phones can build, track the marker and execute a compatible tiny model; optional LAN probe for P1 risk.

Requirement references: R01, R05, R15, R18, R19, R22, R25, R29; B04/B05 shape only; D06/D09/D14/D21/D25.

Dependencies: P01.M02

Navigation: [master roadmap](../../../PLANS.md), [scope](../SCOPE_BASELINE.md), [decisions](../DECISIONS.md), [risks](../RISKS_AND_GAPS.md), [progress](../PROGRESS.md).

## Prerequisites and dependencies

P01.M02 and access to named phones (Q05). Resolve contest runtime wording Q02 and printed-prop permission Q04 for final compliance acceptance; otherwise clearly label bounded probes provisional.

## Scope and explicit non-goals

Independent small scenes and a tiny genuinely trained/exported float32 compatibility model. Prove deployment and APIs before final gameplay/data/art work. M03 is conditional on pursuing P1 and can be bypassed while required M04 continues; M04 depends on M02, not M03.

Non-goals: No final tactical model, polished AR encounter, complete multiplayer gameplay, cloud setup, spectator bridge or final accuracy/performance claims.

## Expected deliverables and affected systems

Device/OS capability matrix, installed probe builds, marker setup, matching golden model inputs/outputs, runtime and signing notes, optional two-client connection evidence.

All affected source/tool paths are future deliverables, not existing files. This document authorizes no source edits.

## Milestones and tasks in implementation order

### P03.M01 — Build and track on demonstration devices

Predecessors: P01.M02

- [ ] P03.M01.T01 — Record phone models/OS, AR support and signing/install access; locate or set up approved Xcode/Android tooling, choose the first viable phone, and build/install the minimal app there. Inventory remaining-platform setup for M04.
- [ ] P03.M01.T02 — Use one measured temporary reference image to place a cube, show tracking states, and exercise camera denied/unsupported/error paths without triggering combat.
- [ ] P03.M01.T03 — Record actual first-phone observations and initial multi-point alignment/recovery measurements; explicitly distinguish standalone tracking from shared multiplayer. Continue the other platform's setup in parallel.

Acceptance: The first approved phone runs the probe and recognizes the measured image with correct orientation. Remaining-platform proof is M04; it remains required for the proposed two-platform release.

Verification: Real device runs plus photos/screenshots/logs where appropriate; inspect oblique views, temporary occlusion and permissions. Editor simulation does not satisfy this milestone.

### P03.M02 — Tiny exported model runs with numerical parity

Predecessors: P03.M01

- [ ] P03.M02.T01 — Select a verified compatible isolated Python/TensorFlow environment and train a tiny shape-compatible [1,32]→[1,5] model solely for inference compatibility.
- [ ] P03.M02.T02 — Export float32 .tflite; compare identical golden inputs in TensorFlow/exported runtime and the selected Unity adapter; name whether Sentis or native LiteRT actually executes.
- [ ] P03.M02.T03 — Run inference in Unity and on the first approved phone, record output differences, malformed-input behavior, latency and disposal; establish selected-runtime API/version requirements. Remaining-platform inference is M04.

Acceptance: Valid outputs and documented numerical agreement in Unity and the first phone; contest runtime requirement is satisfied or explicitly still blocking final acceptance. Remaining-platform proof cannot be waived. This is not evidence of learned tactical quality.

Verification: Golden-observation tests plus phone executions, output-shape/nonfinite checks and repeated load/unload inspection. Provisional 0.001 tolerance is a target requiring recorded results.

### P03.M03 — Optional two-device LAN connection probe

Predecessors: P03.M01

Conditional activation: authorized P1 probe and two usable devices; independent of M02/M04 completion.

- [ ] P03.M03.T01 — If P1 is authorized, use an isolated minimal NGO/Transport setup with practical host-address entry and verify actual peer connectivity on the intended network.
- [ ] P03.M03.T02 — Exchange a timestamped versioned counter/state and test connection loss; document venue isolation and local network permission requirements.
- [ ] P03.M03.T03 — Record host/client platforms and connection method. If P1 is not selected, mark this milestone Not activated rather than Passed.

Acceptance: Two devices exchange authoritative updates, or a concrete network blocker/alternative is recorded. This probe does not prove raid synchronization.

Verification: Actual connection and deliberate disconnect on both proposed host platforms where possible; no internet join-code or Relay claim from a LAN probe.

### P03.M04 — Remaining-platform AR and inference proof

Predecessors: P03.M02

M03 is optional and does not block this required remaining-platform gate.

- [ ] P03.M04.T01 — Finish authorized SDK/module/signing setup for the other named platform; install and run the same marker probe and record actual capability/error paths.
- [ ] P03.M04.T02 — Run the identical tiny model/golden observations on that phone, compare outputs and resource behavior, and record backend/platform differences.
- [ ] P03.M04.T03 — Close the two-platform capability matrix with exact versions and evidence; keep a failing platform open or obtain an explicit scope change before release claims.

Acceptance: Both named platforms have actual marker and compatible inference proof. This gate is required before P07.M03 accepts both-phone integrated gameplay and before P08 P0 acceptance.

Verification: Actual installations, multi-point tracking/error inspection, golden inference results and device logs. Desktop or first-phone success is not substituted for this evidence.

## Integration considerations and technical risks

Probe model/assets are separate from final boss artifacts. No unsupported operator workaround may silently switch away from required TensorFlow training/runtime semantics. Device failures can block later integration without blocking the independent desktop slice.

## Objective acceptance criteria

M01/M02 establish the first platform and M04 completes both-platform proof, with actual runtime/hardware evidence. Conditional M03 status remains separate and gates 09 only; it cannot block P0.

## Testing and verification strategy

Use verified editor/build steps from 01 plus explicitly documented Xcode/Android install steps. Device signing or compilation is not inferred from discovered executable names.

Use the [command registry](../../../PLANS.md#verification-commands-and-evidence-rules). Proposed commands must be established and executed before being reported as passing. Record exact commands, discovered test counts, exit results, platform/backend, config versions and artifact hashes. Relevant failing or unavailable checks remain open.

## Manual demonstration or inspection

Launch on iPhone and Android, grant/deny camera deliberately, scan the same image, orbit a cube, obscure/reveal it, run golden inference, inspect output/runtime labels; perform LAN probe only within its authorized scope.

## Definition of Done

Every required milestone has its acceptance evidence; relevant automated and manual checks pass; no dependent blocker is hidden; approved scope is respected; existing work outside the authorized phase scope is preserved. Update PROGRESS.md with evidence dimensions and handoff, and revise decisions/risks only where actual work changes them. Source generation alone is insufficient.

## Approval or completion gate

Authorization must cover actual device work. Unknown Q02/Q04 permit clearly provisional experiments, not contest acceptance. M03 needs P1 probe authorization; its deferral is recorded without calling multiplayer verified.

The current planning task must stop before implementation. After initial approval, passing this gate permits only the next work inside the user's authorized range; conditional expansion is not activated automatically.

## Handoff requirements

M01 supplies AR adapter/measurement knowledge to 07. M02 supplies validated runtime constraints to 05/06. M03 supplies transport/venue evidence to 09. M04 is the remaining-platform gate for P07.M03 and P08. Keep device logs and exact installed toolchain versions.
