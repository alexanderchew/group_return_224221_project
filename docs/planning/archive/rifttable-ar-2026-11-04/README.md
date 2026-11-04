# RiftTable AR

A proposed miniature fantasy boss-raid game for a real tabletop, developed as a school AI contest prototype. The intended game combines five complementary hero roles, phone-based 3D augmented reality, and meaningful use of TensorFlow.

**Status: specification and roadmap prepared; game implementation has not started.** This checkout contains documentation only. No playable build, Unity project, trained boss model, AR verification, or multiplayer verification exists here.

RiftTable AR is a working title. The original target is **1–5 human players against 1–3 computer-controlled enemies**. Delivering that target in stages is recommended, but the MVP split and detailed defaults still need approval.

## Start here

| Document | Authority |
| --- | --- |
| [Project specification](docs/PROJECT_SPEC.md) | Consolidated player experience, scope classifications, acceptance criteria, and readiness verdict |
| [Scope baseline](docs/planning/SCOPE_BASELINE.md) | Requirement IDs R01–R29, source authority, and proposed rule packs B01–B05 |
| [Development roadmap](PLANS.md) | Implementation order, dependencies, phase gates, and requirements traceability |
| [Decision register](docs/planning/DECISIONS.md) | Confirmed decisions, recommendations, rationale, and superseded proposals |
| [Risks and open decisions](docs/planning/RISKS_AND_GAPS.md) | Blockers Q01–Q06, technical risks, and inspected environment |
| [Progress](docs/planning/PROGRESS.md) | Actual execution and verification status |
| [Consolidation audit](docs/planning/CONSOLIDATION_AUDIT.md) | Reviewed sources, missing history, scope reconciliation, and coverage audit |
| [Agent instructions](AGENTS.md) | Repository boundaries for future coding sessions |

The README is the high-level entry point. Detailed requirements belong to the scope baseline; sequencing belongs to PLANS.md. A pasted implementation prompt or assistant recommendation is not approval to implement it.

## Game concept and player experience

The confirmed concept is a small boss-only raid with a tank, a healer, and three damage roles. Players view miniature combat on a table and use their roles to cooperate against computer-controlled enemies. The desired preparation includes five physical starting marks and a randomized arrangement of warriors.

**Combat requires an explicit Start Raid action.** Camera detection must never start a fight. This is a confirmed requirement.

The recommended complete loop is:

1. Choose a hero and AR or conventional 3D presentation.
2. In AR, scan the shared reference image and confirm alignment.
3. Inspect the randomized A–E formation and press Ready.
4. Explicitly press Start Raid, then complete a short countdown.
5. Move, select targets, use abilities, and respond to boss attack warnings.
6. Reach victory or defeat, inspect results and actual AI decisions, then retry.

Movement, bots, ability count, countdown details, and the AI analysis interface are proposed defaults. Their exact rules are recorded in the scope baseline rather than treated as implemented features.

## Scope and MVP

There is **no fully approved MVP package yet**. The recommended P0 is a complete solo raid with four allied bots, one boss, real TensorFlow-trained boss decisions, explicit preparation/start, AR tested separately on the approved iPhone and Android, a conventional 3D fallback, and reproducible AI evaluation.

| Classification | Scope |
| --- | --- |
| Confirmed project intent | Tabletop 3D AR; five roles; 1–5 humans; 1–3 enemies; TensorFlow use; physical starting marks/randomization; deliberate start |
| Proposed P0 / MVP | One human and four bots; one boss; two active abilities and automatic attacks; movement/targeting; learned boss; AI Lab; both mobile platforms and offline conventional 3D |
| Confirmed later-phase commitments | None explicitly approved as a delivery tier; the original player/enemy capacities remain confirmed targets |
| Proposed subsequent delivery | Two-human cooperation, then separately authorized minion and 3–5-human validation |
| Optional and unapproved | Spectator screen, Three.js viewer, full visual replay, advanced learning, Relay, host migration |
| Explicitly rejected behavior | Starting combat automatically from camera/marker detection |

The earliest development slice is smaller than P0: **P02.M02**, a deliberately started desktop hero-versus-boss fight with an ability and a complete outcome. It uses a labeled scripted development boss and does not establish AR or learned-AI completion.

## Proposed technology and architecture

TensorFlow and the repository's canonical C# core/adapter boundaries are explicit constraints. Engine/package versions, delivery commitments and most detailed implementation choices remain recommendations, subject to adoption and compatibility proof.

| Responsibility | Proposed technology / boundary |
| --- | --- |
| Gameplay, presentation, input | Unity 6.3 LTS, C#, Universal Render Pipeline |
| Canonical combat | Required: one Unity-independent C# core; proposed: fixed ticks and sharing with headless simulation |
| Tabletop placement | AR Foundation with compatible ARKit/ARCore providers; measured image marker and board-local coordinates |
| Training and evaluation | Python, TensorFlow/Keras; imitation learning from the canonical simulator |
| Model execution | Float32 `.tflite` export; Sentis candidate, native LiteRT if the contest requires that runtime |
| Later multiplayer | One authoritative host; Netcode for GameObjects candidate; connection method pending |
| Content | Simple original or appropriately licensed miniatures; Blender when custom modeling is needed |

The simulation resolves combat. UI, AR, rendering, networking, and inference are adapters. Each phone keeps its own AR alignment; multiplayer shares board-local state. Only the authority selects and applies boss actions.

Training with TensorFlow and executing with Sentis are distinct claims. The contest's runtime rule is unresolved. The [decision register](docs/planning/DECISIONS.md#technical-sources-checked-during-planning) contains the official documentation and candidate-version evidence; no package is pinned or locally proven yet.

## Repository structure

Existing documentation:

```text
README.md
AGENTS.md
PLANS.md
docs/
  PROJECT_SPEC.md
  planning/
    SCOPE_BASELINE.md
    DECISIONS.md
    RISKS_AND_GAPS.md
    PROGRESS.md
    CONSOLIDATION_AUDIT.md
    phases/                 # 11 proposed implementation phases
```

`RiftTableAR/` is a proposed future game subtree. It does not exist, and its location still needs approval. The unrelated StudySmart notebook and its README content were removed at the user's request; this README documents the game.

## Prerequisites and local development

There is currently no installation, build, or game-test command that can run against this checkout. Do not run the proposed commands in PLANS.md as if the referenced projects already existed.

After implementation is authorized, Phase 01 must locate or establish Unity and the .NET toolchain and prove that one core builds in both environments. Phase 03 must establish compatible Python/TensorFlow, mobile build tools, signing/install access, and actual AR-capable devices. Exact versions and working commands will be recorded after verification.

Current inspection did not find Unity, `dotnet`, or `adb` in PATH, or full Xcode/Unity/Android SDK in the checked conventional locations. Phone models and OS versions are unknown. See the [environment evidence](docs/planning/RISKS_AND_GAPS.md#read-only-tooling-inventory) for the inspection limits.

## Roadmap

| Stage | Phases | Verifiable outcome |
| --- | --- | --- |
| S1: Foundation and feasibility | 01–03 | Shared builds, first desktop fight, early phone AR/model probes |
| S2: Solo party encounter | 04 | Complete five-role raid with bots, preparation, and results |
| S3: Learned boss | 05–06 | Reproducible training/evaluation, real boss inference, matched decision analysis |
| S4: Solo tabletop demonstration | 07–08 | Integrated AR, recovery, measured performance, install/rehearsal evidence |
| S5: Cooperation | 09, conditional | Complete authoritative two-phone raid and recovery |
| S6: Remaining original capacity | 10–11, conditional | Enabled minion configurations and physical 3–5-player validation |

The proposed P0 path is **01 → 02 → 04 → 05 → 06 → 07 → 08**, with Phase 03 running alongside the first gameplay slice and joining the ML/AR gates. Every milestone has acceptance and verification criteria in [PLANS.md](PLANS.md) and its linked phase file. No calendar commitment is established.

## Limitations and implementation readiness

**BLOCKED for implementation entry:** the game location (Q01), relevant scope/architecture adoption (Q06), and explicit implementation authorization remain outstanding. This documentation request grants no coding permission.

Further gates concern the contest's TensorFlow runtime requirement, permission to use a printed marker, actual devices/signing, and submission/presentation facts. They block the affected commitments; they need not prevent an authorized desktop foundation or explicitly provisional probe.

No accuracy, frame rate, alignment tolerance, inference latency, or capacity target has been measured. P0 completion requires the [acceptance matrix](docs/PROJECT_SPEC.md#12-mvp-deliverables-and-acceptance-criteria), not merely source files.

## Development guidelines and license

Read AGENTS.md and the active phase before changing the project. Preserve requirement statuses, use one combat core, label scripted/fallback behavior honestly, and record passing checks before advancing progress. Scope changes must update the linked decision, requirement, and validation records.

The latest user request authorizes committing and merging this documentation/cleanup into local main. Game implementation, dependency installation, pushes, deployment, and external writes remain unauthorized; the merge does not adopt proposed scope. The project license and distribution route are **TBD**; no license file is established. Use original or appropriately licensed assets and retain their attribution when content production begins.
