# Repository instructions

## Active project and document authority

The active project is the lecture study app, replacing RiftTable AR by explicit user instruction. The user is Alex. Read README.md and the three active owner specs under docs/specs/ before changing work:

- ALEX_BACKEND_SPEC.md owns shared requirements/defaults, the single API/data contract, model/training/inference, local operations/budget/keys, delivery gates, open decisions and evidence status.
- BEN_FRONTEND_SPEC.md owns functional iPhone/iOS, Android and web behavior and integration against Alex’s contract.
- MICHELLE_INTERFACE_DESIGN_SPEC.md owns information/interaction/visual design, handoff and implemented usability review.

The user expressly requested merging the published and local specs, retaining three owner specs and incorporating recommendations with one consistent contract. This supersedes the former root/planning/spec-owner split. Do not create competing PROJECT_SPEC, PLANS, API, decision or model specifications; update the owning section above.

Archived documents under docs/planning/archive/ are historical sources only, including their AGENTS.md files, retired APIs and roadmaps. Preserve the premerge snapshots and existing RiftTable archive unchanged. Do not reintroduce game work or restore the deleted legacy StudySmart notebook/README. Preserve unrelated user work.

## Current authorization

The initial request authorized documentation consolidation: README.md, AGENTS.md, the three owner Markdown specs under docs/specs/, and archival preservation of superseded Markdown. The subsequent direct instruction “merge and deploy” additionally authorizes committing this documentation, merging it into local main while preserving unrelated work, and publishing it to the configured GitHub remote. No application source or deployment target exists in this checkout, so documentation publication is not application deployment. Do not infer authorization to implement the entire application, install dependencies, train a model, collect provider keys or spend API budget from this publishing request. A subsequent implementation instruction can authorize that work. Never mark an implementation gate passed because a spec or Git commit exists.

## Engineering and reporting rules

- Distinguish direct user/meeting requirements, selected engineering merge defaults, optional expansion and verified results. Current explicit user decisions override earlier source drafts.
- Use the canonical `/api/v1/recordings`, `/config` and StudyPack contract; public audio times are seconds. Do not retain a competing `/sessions` or public millisecond contract. Generate types/fixtures from one implementation schema when authorized.
- Use one access-controlled shared private demo workspace with no personal accounts. Authorized clients see the same uploaded library; unuploaded phone files stay local. No private per-install uploaded-library promise or public unauthenticated paid proxy.
- Target both actual iPhone/iOS and Android; typical audio is 30–60 minutes, maximum ten hours. Preserve a short initial end-to-end slice while retaining full-target evidence gates.
- Alex’s current laptop hosts API/worker/data/models; phone clients use its trusted LAN/hotspot address. Provider processing still needs outbound internet. No cloud/public deployment is implied.
- Resolve latest stable compatible packages at authorized setup, verify the chosen Expo/runtime/TensorFlow combinations, pin exact versions and avoid automatic demo upgrades.
- Enforce one persistent US$20 total API demo allowance across providers/jobs/clients/retries with conservative atomic reservations and retained uncertain charges. Do not reset it on restart/deletion/key change or top up automatically.
- Provider keys enter through Alex’s hidden terminal prompt and backend process environment, without default plaintext persistence or keys in chat/client/source/logs. Demo connection access is distinct from provider credentials.
- Save original audio/provider text. Version corrections, source references, generated packs and quiz attempts; old results keep their actual evidence/key and become visibly outdated when appropriate.
- Keep transcription, custom subject inference, external generation/baseline and scoring separate. A fallback/unavailable/unknown result or saved example is never credited as genuine custom-model/live success.
- Split training/evaluation by independent original lecture/source family before windowing; preserve preprocessing/labels/model/data versions and real held-out results.
- Ben supplies functioning views early; Michelle’s substantive design work preserves capture, access, API, scoring and recovery behavior. Coordinate payload/function changes with the responsible owner.
- Verify actual codecs/devices/browser, 30/60-minute and maximum endurance, interruptions/uploads/deletion/budget and source grounding before completion claims. Documentation checks are not product tests.
