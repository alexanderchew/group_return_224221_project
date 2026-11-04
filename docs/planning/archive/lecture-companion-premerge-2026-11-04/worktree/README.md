# IGCSE Lecture Companion

Working title for a study app that turns recorded or uploaded lessons into saved transcripts, structured lecture notes, a lecture overview, and questions with feedback. The team trains a TensorFlow/Keras subject classifier; ElevenLabs provides transcription and an external LLM initially generates the study material.

**Status: detailed documentation prepared; application implementation has not started.** The user explicitly replaced RiftTable AR with this project on 2026-11-04. The former game documents are preserved in the [historical archive](docs/planning/archive/rifttable-ar-2026-11-04/ARCHIVE.md). The previously removed StudySmart notebook has not been restored.

## Read the specification

| Document | Purpose |
| --- | --- |
| [Full project specification](docs/PROJECT_SPEC.md) | Product behavior, architecture, failure handling, data, and acceptance criteria |
| [Scope baseline](docs/planning/SCOPE_BASELINE.md) | Requirement IDs, source authority, status, and proposed numerical defaults |
| [Frontend specification](docs/planning/specs/FRONTEND.md) | Ben: mobile/web screens, recording, local persistence, and API integration |
| [Backend specification](docs/planning/specs/BACKEND.md) | Alex: ingestion, storage, transcription, generation, marking, and operations |
| [Model specification](docs/planning/specs/AI_MODEL.md) | Shared team responsibility: dataset, training, evaluation, and inference |
| [Design specification](docs/planning/specs/DESIGN.md) | Michelle: visual design and accessibility without breaking behavior |
| [Shared contracts](docs/planning/specs/SHARED_CONTRACTS.md) | Common objects, API semantics, versions, errors, and integration fixtures |
| [Implementation sequence](PLANS.md) | Dependencies and evidence gates across the workstreams |
| [Clarifications and risks](docs/planning/RISKS_AND_GAPS.md) | Prioritized questions, suggested answers, owners, and consequences |
| [Decisions](docs/planning/DECISIONS.md) | Meeting decisions versus recommendations awaiting adoption |
| [Progress](docs/planning/PROGRESS.md) | What exists and what has actually been verified |
| [Source audit](docs/planning/CONSOLIDATION_AUDIT.md) | Meeting/attachment reconciliation and official technical sources |

## Intended workflow

Record or import audio → save and upload → transcribe with ElevenLabs → optionally review/correct the transcript → classify with the team's model → generate notes, lecture overview, and quiz → answer questions → review feedback and source evidence.

Build a working functional interface first. Ben and Alex develop against shared contracts; Michelle can redesign the interface while retaining its functions. Model training proceeds separately and joins through a stable classifier adapter. The first end-to-end demo can honestly show “classifier not connected”; the final trained-model demonstration must execute the team's real model.

Alex has confirmed **iPhone/iOS and Android**, recordings usually **30–60 minutes** with a **ten-hour maximum**, and demo hosting/storage on **his current laptop**. The combined API budget is **US$20 for the demo**, interpreted as a total across providers/jobs; paid work must reserve budget before each request.

Use the **latest stable compatible package releases at setup**, then pin the exact verified versions. Alex will enter provider keys through a **no-echo terminal launcher** on his laptop; the planned script supplies them only to backend processes. React Native, React web and FastAPI remain the proposed frameworks; exact subjects/languages, exam board, rubric/deadline, native recording behavior and device/OS inventory still need resolution. Detailed operating controls are CFG-07–CFG-10 in the scope baseline.

## Repository and authorization

This checkout contains documentation, not an app, API service, dataset, or trained model. There are no runnable application setup/test commands yet. The current request authorizes the specification and documentation replacement. Bootstrap, dependency installation, application code, paid API calls, deployment, publishing, and remote writes require a subsequent implementation instruction.

Read [AGENTS.md](AGENTS.md) before making changes. The root roadmap owns sequencing, the scope baseline owns requirement/default wording, and the clarification register owns open questions. The final product name remains undecided; this title is a descriptive placeholder.
