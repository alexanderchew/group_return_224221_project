# Lecture Companion

Working descriptor for an IGCSE study app: record or import a lesson, save its transcript, produce lecture-grounded notes and an overview, then answer questions with source-linked feedback. ElevenLabs handles transcription; an external LLM initially generates study materials; the team trains a TensorFlow/Keras subject classifier.

**Status: merged specifications only. No application, service, trained model or passing device test exists in this checkout.**

The active specification set has three owners:

| Owner | Specification and authority |
| --- | --- |
| Alex — backend and integration | [Backend, processing and AI integration](docs/specs/ALEX_BACKEND_SPEC.md): shared requirements/defaults, canonical API, model/data, budget/credentials, delivery gates and remaining decisions |
| Ben — mobile and web frontend | [Functional frontend](docs/specs/BEN_FRONTEND_SPEC.md): iPhone/Android/web recording/import, local library, API integration, study/quiz UI and recovery |
| Michelle — interface design | [Mobile and web interface design](docs/specs/MICHELLE_INTERFACE_DESIGN_SPEC.md): information/interaction design, tokens/components, screen states, accessibility and implemented usability review |

Confirmed operating choices: the user is Alex; support iPhone/iOS and Android; normal recordings last 30–60 minutes with a ten-hour maximum; host/save the demo on Alex’s current laptop; control total API usage within US$20; enter provider keys privately through a terminal launcher. Use latest stable compatible packages at setup, then pin verified versions. The launcher is specified, not implemented.

The merged contract uses `/api/v1/recordings`, `/config`, `StudyPack` and seconds for media times. Authorized demo devices share one controlled uploaded library; unuploaded originals remain local. Build a short real end-to-end slice first while retaining normal/max-duration and browser-recording requirements in the full target. A baseline/fallback is never presented as the team’s trained model.

[AGENTS.md](AGENTS.md) defines working rules. The [premerge source archive](docs/planning/archive/lecture-companion-premerge-2026-11-04/MERGE_SOURCES.md) preserves both document sets; the [RiftTable archive](docs/planning/archive/rifttable-ar-2026-11-04/ARCHIVE.md) remains historical. The previously deleted StudySmart notebook is not restored. Archived plans/APIs/instructions are not active authority.

The user subsequently requested “merge and deploy,” authorizing committing, integrating and publishing these specifications to GitHub main. This repository contains no runnable application or deployment configuration; publishing the documentation does not deploy an app. Application bootstrap, dependency installation, provider-key collection and paid API calls have not been performed. Exact environment/package versions and device/account/teacher-rule facts still need the checks listed in Alex’s spec before corresponding implementation claims.
