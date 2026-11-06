# Repository instructions

## Active project and document authority

The active project is the lecture study app, replacing RiftTable AR by explicit user instruction. Owner roles are Alex (backend), Ben (frontend) and Michelle (design); honor the current user’s stated identity rather than assuming every chat is Alex. Read README.md and the three active owner specs under docs/specs/ before changing work:

- ALEX_BACKEND_SPEC.md owns shared requirements/defaults, the single API/data contract, model/training/inference, local operations/budget/keys, delivery gates, open decisions and evidence status.
- BEN_FRONTEND_SPEC.md owns functional iPhone/iOS, Android and web behavior and integration against Alex’s contract.
- MICHELLE_INTERFACE_DESIGN_SPEC.md owns information/interaction/visual design, handoff and implemented usability review.

The user expressly requested merging the published and local specs, retaining three owner specs and incorporating recommendations with one consistent contract. This supersedes the former root/planning/spec-owner split. Do not create competing PROJECT_SPEC, PLANS, API, decision or model specifications; update the owning section above.

Archived documents under docs/planning/archive/ are historical sources only, including their AGENTS.md files, retired APIs and roadmaps. Preserve the premerge snapshots and existing RiftTable archive unchanged. Do not reintroduce game work or restore the deleted legacy StudySmart notebook/README. Preserve unrelated user work.

## Current authorization

The user subsequently explicitly instructed: “start implementing my backend part according to Alex’s spec and get it running locally on my laptop.” This authorizes Alex’s backend source, project-local dependencies/lockfile, terminal launcher, generated contract/fixtures, meaningful tests and a running local API/worker. Provider credentials must still be entered privately through the terminal; provider work must remain explicit and within the shared US$20 allowance. Unit verification uses labeled provider doubles, never hidden mock production output or automatic paid calls. The user separately authorized a short real-provider end-to-end test capped at US$2; its cumulative reservation guard, original allowance and charges must be preserved. That single test authorization is not permission for recurring paid tests. Frontend/mobile implementation, collecting a new training dataset, claiming a trained model, cloud deployment, and a new commit/push are not implied by this local backend task. Preserve the prior published documentation and immutable source archives. Never mark a complete product/mobile/provider gate passed from backend unit tests alone.

The follow-up instruction authorizes fixing answer-position bias and inline overview IDs, then verifying offline with no more paid API calls. Preserve historical scored packs/attempts and raw provider checkpoints; shuffle/relabel only before a new pack is published. Saved-output replay is labeled offline and does not count as a fresh provider run. Tests block external HTTP. Do not extract in-memory provider keys to restart the server.

The subsequent direct instruction “merge and deploy” authorizes committing the backend/fixes, merging into local main, publishing to the configured GitHub origin and restarting the existing laptop service. Preserve unrelated work, local data, accounting and historical packs. This is a local deployment, not public/cloud hosting or permission for another paid test. Restart through the terminal launcher; Alex re-enters ephemeral provider keys privately if needed.

On 4 November 2026, Ben identified himself and requested starting implementation. This authorizes the frontend source/dependency bootstrap under `apps/web/` and its local verification. Alex’s API is not ready, per Ben. The first frontend checkpoint and unresolved integration assumptions are in Ben’s spec section 11. No backend implementation, paid provider work, model training, public deployment or publication of the frontend is implied. Earlier documentation-only checkout descriptions above describe the prior state.

Ben subsequently prioritized the audio recording interface and requested a modern, compact, user-friendly design. This authorizes recording-first work in `apps/web/` and the native Expo frontend in `apps/mobile/`, with local dependencies and validation. The current evidence is in Ben’s spec section 12. Native source/bundle export is not installation, physical-device verification, measured recovery/endurance or release approval.

Ben then explicitly requested creating a pull request and merging this frontend. Commit/branch publication, PR creation and normal merging are authorized. Preserve branch protection and required checks; this does not authorize application deployment or passing unverified device gates.

Alex subsequently explicitly requested fixing PR #3's CSRF, recorder MIME, quiz-result and budget integration issues, then merging and deploying. This authorizes the PR-branch corrections, regression/real-API tests with labeled provider doubles, the related durationless WebM intake correction, publication and local web/API deployment. Preserve local study data/accounting and immutable source archives. Keep paid providers disabled and make no new paid request. This does not establish native installation or phone/endurance gates. Any required administrator override remains a separate explicit decision.

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
