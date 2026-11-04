# Lecture Companion

Working descriptor for an IGCSE study app: record or import a lesson, save its transcript, produce lecture-grounded notes and an overview, then answer questions with source-linked feedback. ElevenLabs handles transcription; an external LLM initially generates study materials; the team trains a TensorFlow/Keras subject classifier.

**Status: recording is now the main interface. A working foreground browser recorder and native Expo recording app source are implemented locally. Alex’s API is not ready. Native installation, physical phone tests, long-session/endurance tests and live processing remain pending.**

To run the frontend with Node 24:

```sh
npm ci
npm run dev
```

Open the localhost address printed by Vite. The recorder opens first and works without the API: Start, real input meter, Pause/Resume, Stop/save, local playback, import/export and browser-local recordings. Use HTTPS or localhost and allow microphone access. Keep the page visible: switching apps or locking a phone can interrupt browser capture. Export important audio; browser storage can be evicted. The separate Study library retains the upload, processing and study/quiz flow, awaiting Alex’s reachable API and browser access provisioning. There is no built-in fake backend or provider-key input.

The native iPhone/Android app is in `apps/mobile/`. Start its development server with `npm run mobile`. Local development builds use `npm run ios --workspace apps/mobile` or `npm run android --workspace apps/mobile` after installing the corresponding platform tooling and provisioning the test device. These build/install steps have **not** been performed. Background recording configuration requires a development build; an exported JavaScript bundle or browser preview does not prove native capture works.

Validation commands: `npm run typecheck`, `npm run typecheck:mobile`, `npm test`, `npm run build`, `npm run test:browser`, and `npm run export:mobile`. Browser tests use isolated Google Chrome profiles with synthetic microphone input and synthetic API responses. They check actual browser recording/playback but do not prove real microphones, Safari, native devices, providers or long-session behavior. See [Ben’s recorder checkpoint](docs/specs/BEN_FRONTEND_SPEC.md#12-recording-first-checkpoint--4-november-2026).

The active specification set has three owners:

| Owner | Specification and authority |
| --- | --- |
| Alex — backend and integration | [Backend, processing and AI integration](docs/specs/ALEX_BACKEND_SPEC.md): shared requirements/defaults, canonical API, model/data, budget/credentials, delivery gates and remaining decisions |
| Ben — mobile and web frontend | [Functional frontend](docs/specs/BEN_FRONTEND_SPEC.md): iPhone/Android/web recording/import, local library, API integration, study/quiz UI and recovery |
| Michelle — interface design | [Mobile and web interface design](docs/specs/MICHELLE_INTERFACE_DESIGN_SPEC.md): information/interaction design, tokens/components, screen states, accessibility and implemented usability review |

Confirmed operating choices: Alex owns backend/integration and Ben owns frontend; support iPhone/iOS and Android; normal recordings last 30–60 minutes with a ten-hour maximum; host/save the demo on Alex’s current laptop; control total API usage within US$20; enter provider keys privately through a terminal launcher. Use latest stable compatible packages at setup, then pin verified versions. The launcher is specified, not implemented.

The merged contract uses `/api/v1/recordings`, `/config`, `StudyPack` and seconds for media times. Authorized demo devices share one controlled uploaded library; unuploaded originals remain local. Build a short real end-to-end slice first while retaining normal/max-duration and browser-recording requirements in the full target. A baseline/fallback is never presented as the team’s trained model.

[AGENTS.md](AGENTS.md) defines working rules. The [premerge source archive](docs/planning/archive/lecture-companion-premerge-2026-11-04/MERGE_SOURCES.md) preserves both document sets; the [RiftTable archive](docs/planning/archive/rifttable-ar-2026-11-04/ARCHIVE.md) remains historical. The previously deleted StudySmart notebook is not restored. Archived plans/APIs/instructions are not active authority.

The earlier “merge and deploy” request published documentation. Ben subsequently requested starting implementation on 4 November 2026, then explicitly requested a pull request and merge for this recording-first frontend. Source publication does not deploy the application. No application deployment, provider-key collection or paid API call has been performed. Native device/account/teacher-rule facts and the remaining G0 checks still need verification before corresponding completion claims.
