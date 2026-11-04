# Repository instructions

The legacy StudySmart notebook and README content were removed at the user's explicit request on 2026-11-02. They are not part of the game project; do not restore them automatically. The new root README documents RiftTable AR. Preserve the remaining documentation and other user work.

## Active planning entry points

- Start with [README.md](README.md) for the high-level overview and [PROJECT_SPEC.md](docs/PROJECT_SPEC.md) for the consolidated experience, classifications and acceptance criteria.
- Read [PLANS.md](PLANS.md) for sequencing and phase gates.
- Read [scope and source authority](docs/planning/SCOPE_BASELINE.md), [decisions](docs/planning/DECISIONS.md), [risks](docs/planning/RISKS_AND_GAPS.md), and [progress](docs/planning/PROGRESS.md) before changing the game.
- Consult the [consolidation audit](docs/planning/CONSOLIDATION_AUDIT.md) for accessible/missing history and reconciled proposals. Scope baseline owns requirement/default wording; PLANS.md owns sequencing; do not create competing decision or implementation-plan files.
- Read the individual phase file linked from PLANS.md before implementing that phase.
- Confirmed user intent, proposed defaults, conditional expansion, and optional ideas are different statuses. An assistant recommendation or pasted implementation prompt is not approval.

## Current authorization

Documentation only. The user separately authorized legacy cleanup and then a new game README, consolidated specification and supporting Markdown documentation (SPEC-U). Authorized documentation writes are README.md, AGENTS.md, PLANS.md, docs/PROJECT_SPEC.md and Markdown files under docs/planning/. The subsequent request 'merge the code' (MERGE-U) authorizes committing this documentation/cleanup and merging it into local main, preserving unrelated work. It does not adopt proposed scope or authorize game implementation, a remote push or deployment. Do not implement phases, create a Unity project, install dependencies, modify application code/tests, push, deploy, or write to external services. Wait for explicit implementation approval.

## Future implementation, once authorized

- Resolve the project-location decision before bootstrap. The recommended new game subtree is `RiftTableAR/`; it does not currently exist. Removing the legacy files does not settle this decision or authorize bootstrap.
- Keep one Unity-independent C# combat core. AR, UI, networking, rendering, and inference are adapters; they do not independently resolve combat.
- Preserve explicit Start Raid. Marker detection, alignment confirmation, and all-ready events never start combat.
- Network board-local state; keep each device's AR alignment local. The host chooses combat outcomes and boss decisions.
- Train with TensorFlow using game-derived training data; identify the actual inference runtime and any fallback honestly.
- Verify relevant behavior and record evidence before marking a milestone complete. Distinguish a specification, source that exists, passing tests, device verification, and a repeatable demonstration.
- Use seeded scenarios and versioned rules/model/data contracts. Scope or contract changes update the linked planning documents and affected validation.
- Prefer small playable slices and existing Unity facilities. Do not introduce spectator web infrastructure, cloud anchors, host migration, full replay, or advanced learning without scope authorization.
