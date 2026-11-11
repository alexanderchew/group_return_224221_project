# Lecture Companion

Working descriptor for an IGCSE study app: record or import a lesson, save its transcript, produce lecture-grounded notes and an overview, then answer questions with source-linked feedback. ElevenLabs handles transcription; an external LLM initially generates study materials; the team trains a TensorFlow/Keras subject classifier.

**Status: recording-first web and native Expo frontend source, plus Alex’s initial backend, are implemented.** Generated frontend types and an offline real-HTTP web/backend walkthrough are verified. Native installation, physical-phone tests and long-session/endurance tests remain pending. Alex separately verified one short real-provider run; the new web check replays saved output and makes no paid calls.

To run the frontend with Node 24:

```sh
npm ci
npm run dev
```

For local API integration, start Alex’s launcher separately and keep the frontend’s own address in **Connect laptop**. Select **Set up browser access**, enter the separate demo connection code, then return and connect. Vite proxies `/api/v1` and `/operator` to loopback port 8000 while preserving the browser host, so access/CSRF cookies stay on one origin. This development proxy is not a production hosting setup.

Generate/check client types with `npm run generate:client` / `npm run check:client`; the source remains `fixtures/contracts/openapi.json`. `npm run test:integration` starts isolated real HTTP APIs, workers and Chrome, with external provider HTTP blocked. The complete study flow uses visibly labeled saved-output replay and a silent placeholder; a second check uploads fresh synthetic-microphone WebM to the actual decoder. These tests never use or reset Alex’s live data/budget.

Open the localhost address printed by Vite. The recorder opens first and works without the API: Start, real input meter, Pause/Resume, Stop/save, local playback, import/export and browser-local recordings. Use HTTPS or localhost and allow microphone access. Keep the page visible: switching apps or locking a phone can interrupt browser capture. Export important audio; browser storage can be evicted. The separate Study library retains the upload, processing and study/quiz flow, verified against the local API with explicitly labeled offline replay; fresh-provider frontend verification remains pending. There is no built-in fake backend or provider-key input.

The native iPhone/Android app is in `apps/mobile/`. Start its development server with `npm run mobile`. Local development builds use `npm run ios --workspace apps/mobile` or `npm run android --workspace apps/mobile` after installing the corresponding platform tooling and provisioning the test device. The iOS project and CocoaPods dependencies are generated; device installation is still blocked by local signing/Developer Mode setup. See Ben’s section 14 for current evidence. Background recording configuration requires a development build; an exported JavaScript bundle or browser preview does not prove native capture works.

Validation commands: `npm run typecheck`, `npm run typecheck:mobile`, `npm test`, `npm run build`, `npm run test:browser`, and `npm run export:mobile`. Browser tests use isolated Google Chrome profiles with synthetic microphone input and synthetic API responses. They check actual browser recording/playback but do not prove real microphones, Safari, native devices, providers or long-session behavior. See [Ben’s recorder checkpoint](docs/specs/BEN_FRONTEND_SPEC.md#12-recording-first-checkpoint--4-november-2026).

The active specification set has three owners:

| Owner | Specification and authority |
| --- | --- |
| Alex — backend and integration | [Backend, processing and AI integration](docs/specs/ALEX_BACKEND_SPEC.md): shared requirements/defaults, canonical API, model/data, budget/credentials, delivery gates and remaining decisions |
| Ben — mobile and web frontend | [Functional frontend](docs/specs/BEN_FRONTEND_SPEC.md): iPhone/Android/web recording/import, local library, API integration, study/quiz UI and recovery |
| Michelle — interface design | [Mobile and web interface design](docs/specs/MICHELLE_INTERFACE_DESIGN_SPEC.md): information/interaction design, tokens/components, screen states, accessibility and implemented usability review |

Confirmed operating choices: Alex owns backend/integration and Ben owns frontend; support iPhone/iOS and Android; normal recordings last 30–60 minutes with a ten-hour maximum; host/save the demo on Alex’s current laptop; control total API usage within US$20; enter provider keys privately through the implemented terminal launcher. Use latest stable compatible packages at setup, then pin verified versions.

The merged contract uses `/api/v1/recordings`, `/config`, `StudyPack` and seconds for media times. Authorized demo devices share one controlled uploaded library; unuploaded originals remain local. Build a short real end-to-end slice first while retaining normal/max-duration and browser-recording requirements in the full target. A baseline/fallback is never presented as the team’s trained model.

[AGENTS.md](AGENTS.md) defines working rules. The [premerge source archive](docs/planning/archive/lecture-companion-premerge-2026-11-04/MERGE_SOURCES.md) preserves both document sets; the [RiftTable archive](docs/planning/archive/rifttable-ar-2026-11-04/ARCHIVE.md) remains historical. The previously deleted StudySmart notebook is not restored. Archived plans/APIs/instructions are not active authority.

## Run Alex’s backend locally

Dependencies are pinned in `pyproject.toml` and `uv.lock`. Alex verified a Python 3.13 `.venv`, FFmpeg and the pinned dependencies on his laptop; other checkouts need their own environment setup. To reproduce the environment, use `uv sync --frozen`.

```sh
./scripts/start_demo.command
```

The terminal prompts privately for ElevenLabs/OpenAI keys; Enter leaves a provider disabled. Provider keys stay in process memory/environment and are not saved to `.env` or sent to clients. Startup does not make a paid provider request. For a key-free local run:

```sh
./scripts/start_demo.command --no-prompt
```

Open [API documentation](http://127.0.0.1:8000/docs). The terminal displays a **demo connection code**, distinct from your provider keys. Use Swagger’s **Authorize** button with that code, or open [browser access setup](http://127.0.0.1:8000/operator/connect). Cookie-authenticated mutations also require `X-CSRF-Token` matching the `lecture_csrf` cookie. Every authorized client shares the uploaded demo library.

Local data and content-free spending records stay under the ignored, private `var/demo/` directory. Stop with Ctrl+C in the server terminal. To add provider keys to an already-running key-free server, stop it and restart the normal launcher. For phone access, explicitly bind to your laptop’s trusted LAN IP with `--host <laptop-LAN-IP>`; the default localhost binding is laptop-only.

The initial verified intake envelope is **60 minutes and 128 MiB**, with ten hours/2 GB retained as the full target. WAV, MP3, M4A/AAC and WebM/Opus are decoded/normalized server-side. `/config` reports active and target limits and `prototype_limited`; no ten-hour/device/provider claim is inferred from synthetic intake tests. Missing provider keys yield a persisted blocked job. A compatible optional TensorFlow bundle can be connected later; missing artifacts stay explicitly unavailable.

```sh
.venv/bin/pytest -q
.venv/bin/ruff check services scripts tests
.venv/bin/python scripts/export_contract.py
```

The generated [OpenAPI contract](fixtures/contracts/openapi.json) comes from the implementation. Detailed setup/behavior/evidence and outstanding limitations remain in [Alex’s spec](docs/specs/ALEX_BACKEND_SPEC.md#14-backend-implementation-and-local-operation); it is the only active backend plan. Implementation lives under `services/api/lecture_backend/`, with meaningful tests under `tests/`. Real API keys, media, local state and `.venv` are excluded from Git. The subsequent merge/deploy instruction authorizes publishing this backend to GitHub main and restarting the local laptop service, with no additional paid processing.

## First real-provider test

A locally synthesized 60.02-second photosynthesis narration completed through ElevenLabs Scribe v2 and GPT-6 Luna in 22.85 seconds. It produced a transcript (1.24% word error rate against the known script), three note sections and four evidence-linked MCQs. Correct-answer scoring returned 100%; two correct, one wrong and one unanswered returned 50%; repeating the submission reused its attempt.

The conservative ledger total was **US$0.071294** under a temporary cumulative **US$2** request cap. The regular US$20 ceiling was restored with charges retained and no outstanding/uncertain reservations. This is conservative accounting, not an invoice claim. Results/audio remain locally under `var/e2e/live-short-sample/`; the shared demo library retains the labeled synthetic recording. `scripts/run_live_e2e.py` is an opt-in localhost runner; it never reads provider keys and rejects a repeat of a passed run by default.

Content review found answer-position bias (all four correct options were A) and raw evidence IDs in overview prose. Both are fixed for newly published packs: the backend shuffles/balances correct-answer positions and relabels options with the matching frozen key, while overview citations remain only in structured evidence fields. Existing scored packs, attempts and raw provider checkpoints remain unchanged. Subject classification used the labeled external baseline; no custom model was tested.

The follow-up verification replayed that saved output entirely offline: all four answer positions are distinct, the overview has no inline IDs, and scoring still returns 100%/50% for the two checks. **55 tests pass**, with external HTTP blocked during tests; spending remains US$0.071294 with no new provider requests. The original real-provider test is not rerun. Stop/restart the launcher to load source changes into an existing server and re-enter keys privately if needed; keys are not extracted from the running process. Local replay evidence is under `var/e2e/offline-quality-fixes/`.
