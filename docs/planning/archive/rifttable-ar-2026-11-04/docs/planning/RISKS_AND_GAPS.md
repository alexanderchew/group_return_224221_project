# Readiness, risks and unresolved decisions

As of 2026-11-02, Asia/Kuala_Lumpur. Implementation not started. See [scope](SCOPE_BASELINE.md), [decisions](DECISIONS.md), [roadmap](../../PLANS.md), and [progress](PROGRESS.md).

**Readiness verdict: BLOCKED for implementation entry**, pending Q01, relevant Q06 adoption and explicit phase authorization. Toolchain establishment is the first authorized implementation work once those gates close. External facts below block their affected claims rather than every independent desktop task. See the [specification](../PROJECT_SPEC.md#14-risks-dependencies-open-questions-and-readiness) and [source/coverage audit](CONSOLIDATION_AUDIT.md).

## Repository and reuse assessment

At the initial inspection before planning, the tracked files were `README.md` and `261023-prototype-code-v1.ipynb`, with a clean working tree. No Unity project, C# projects, game code/tests, model artifacts, printables or dependency manifests existed. The user subsequently authorized removal of those two StudySmart files on 2026-11-02. The notebook remains absent, and the old README content has been replaced by the separately requested game overview (SPEC-U / D28). The documentation remains, and no game implementation has begun.

The removed README content described StudySmart and referenced absent app.py, requirements.txt, tests, model and training-script files. The removed notebook had two unexecuted cells and no saved outputs, with rule-generated study labels and a 4→8→8→3 TensorFlow classifier. It provided no reusable game component, boss model or combat dataset. Do not restore the legacy content as part of game setup.

All five locally available Git commits concern the former project; no reusable game implementation appears in this history. Read-only connected GitHub searches returned no issues and one merged legacy README PR. Query boundaries and unavailable earlier responses are recorded in CONSOLIDATION_AUDIT.md; inaccessible history cannot approve the proposed baseline.

Historical initial-inspection hashes (not ongoing preservation gates after the authorized deletion):

- README.md: `8008b81983500b87eb404b86a66bfbf28991a2378c62265145047d7adaba4372`
- Notebook: `714a2ff460b2fc4c3fe53387ed397bd586404a0c158d42f4b9451ca5e3e2d030`

## Read-only tooling inventory

Inspection used shell lookup, known application/SDK locations and Python distribution metadata, not a full disk search. 'Not found' is qualified by that boundary. No installation, Unity launch, training, SDK mutation, device deployment or game test was performed.

SPEC-U refreshed Python/host identity, executable lookup and the checked Unity/Xcode/Android directories on 2026-11-02; their limitations remain unchanged. Package metadata below and the xcodebuild failure are observations from the earlier planning inspection, not repeated runtime/import tests during consolidation.

| Item | Observed evidence | Readiness implication |
| --- | --- | --- |
| Host | macOS 26.3, arm64 | Mac host available; actual phone models/OS are not inspected |
| Python | 3.14.7 at /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 | Inspection works; not the selected TensorFlow development environment |
| Python packages | TensorFlow, Keras, pytest absent in that interpreter; NumPy 2.5.3, Matplotlib 3.11.2, pandas 3.0.6, sklearn 1.9.1, torch 2.14.0, joblib 1.6.0 metadata found | Presence does not prove runtime imports or compatibility; no environments changed |
| Unity | No Unity/UnityHub executable in PATH; /Applications/Unity/Hub/Editor and the two conventional Hub app paths absent | Editor/build/test execution blocked until located or installed in an authorized phase |
| Xcode | /Applications/Xcode.app absent; xcode-select -p returns /Library/Developer/CommandLineTools | xcodebuild -version failed because full Xcode is unavailable through the selected directory; the /usr/bin stub is not evidence of iOS build readiness |
| .NET | dotnet absent in PATH; conventional SDK directories absent | Shared core/CLI builds not currently runnable |
| Android | adb absent; ~/Library/Android/sdk absent | SDK/NDK/JDK and Unity Android module remain unverified; /usr/bin/java alone proves nothing about a working JDK |
| Git / optional web tools | Git, node and npm paths found | Git supports inspection; Node is not needed for proposed P0 and was not used to create a viewer |
| Devices/network | User reported iPhone and Android; no connected-device inventory, LAN permissions or AR capability verified | Physical acceptance cannot be inferred |
| Tests | No game tests, .csproj or dependency definitions | All future test/build commands remain proposed; no game tests passed |

## Blocking questions and adoption gates

Owners describe the future source of an answer, not an assigned student. These questions do not authorize tool installation or writes now.

| ID | Question / recommendation | Blocks | Owner / evidence to close |
| --- | --- | --- | --- |
| Q01 | Approve new `RiftTableAR/` subtree here, or name a separate authorized project/repository destination; preserve remaining planning files | P01.M01 bootstrap | User decision + confirmed path/Git boundary; legacy cleanup does not approve a destination |
| Q02 | Does the contest require training with TensorFlow, TensorFlow-derived inference, or native TensorFlow/LiteRT runtime execution? | Final runtime commitment, P03.M02 acceptance, final P05/P06 artifacts and contest-ready claim | Teacher/organizer's exact wording; record source. Provisional probes may proceed only as provisional |
| Q03 | What are submission/build-freeze and presentation dates, team availability and required deliverables? Are Nov 17/19 actually confirmed? | Date promises and final P08 contest packaging | User/organizer evidence; no schedule invented |
| Q04 | Are passive printed markers/mats permitted? No actual 'no hardware' rule was supplied | Marker-based contest-compliance claim / final P07/P08 gate | Organizer confirmation; otherwise replan anchoring explicitly, do not silently add cloud services |
| Q05 | Exact phone models, OS versions, access for installation/signing, and additional devices for five humans? | P03 hardware acceptance; P11 physical capacity claim | Device-owner inventory, AR capability, build/install proof |
| Q06 | Adopt/revise proposed P0/P1 split and B01–B05 packs, including two abilities, timing/threat, input/phase defaults, marker dimensions, budgets and spectator deferral? | Initial toolchain direction within AGENTS-U's required C# boundary before P01; relevant combat defaults before P02/P04; ML/quality packs before consuming gates; optional 09–11 activation | User approval or specific edits in decision register; adoption may be bounded to the authorized phase range, not inferred from planning/specification requests |

Implementation authorization itself is the initial global gate. Once a range is authorized, routine choices within approved contracts can be made by the developer; do not repeatedly ask approval for reversible implementation details. Unanswered questions block their dependent work, not unrelated read-only planning or already-authorized independent work.

## Risk register

| ID | Risk and impact | Severity / type | Mitigation / detection | Blocking point |
| --- | --- | --- | --- | --- |
| RSK01 | Required SDK/editor/compatible Python absent or undiscovered | High, observed environment blocker | P01 locate/install desktop Unity/.NET only after authorization; P03 compatible Python/mobile tooling, signing and runtime probes in parallel with desktop gameplay | Actual builds/tests cannot start now |
| RSK02 | Contest/runtime mismatch or unsupported model operations | High, unresolved architecture/compliance | Q02; P03 tiny [1,32]→[1,5] model on both phones; adapter boundary; do not assume .tflite import equals LiteRT runtime | Final ML runtime and compliance |
| RSK03 | AR unsupported, unstable alignment, print-size mismatch or forbidden prop | High, hardware/compliance | Q04/Q05; P03 probe then P07 final mat; individual AND pairwise multi-point errors; tactical fallback | AR completion gate |
| RSK04 | Incomplete timing, threat, geometry, input/terminal ordering makes training targets/gameplay invalid | High, design adoption | B02/B03; P02 event priority; P04 five-role scenarios and playtest before P05 dataset lock | Full dataset generation |
| RSK05 | Teacher sees hidden state, episode leakage, inaccurate export or config-incompatible model | High, research validity | Observation-only teacher API; seed/scenario splits; golden arrays; manifest validation; independent teacher comparison; per-config reporting | AI validity gate |
| RSK06 | Broad scope versus unknown effort/deadline | High, planning uncertainty | Q03/Q06; P0 independent of 09–11; no spectator/replay/advanced learning implementation; early probes | Promised deadline or expansion commitment |
| RSK07 | Small-screen tapping, accidental movement, unusable healing or stale live analysis | Medium/high, usability | Enemy-centered hero AoE; separate selections; UI hit priority; phone playtests; recorded decision IDs | P07/P08 usability |
| RSK08 | Venue isolation/host suspension/disconnect produces divergent state | High for P1, nonblocking P0 | P03 optional LAN probe; P09 role lease transfer at a tick, snapshot reconnect, defined host loss, actual venue rehearsal | P09 acceptance |
| RSK09 | Average FPS/latency hides stalls, thermals or inference readback blocking | Medium/high, performance | Profile cold/warm full encounters, frame-time distribution and inference p95, not only mean; match-time independent of render stalls | P08 performance gate |
| RSK10 | Unbounded logs or misleading evidence/replay claims | Medium, evidence/runtime stability | Local bounded records; output/decision IDs and hashes; no camera upload; label precomputed results and mixed-policy intervals; no replay promise | Evidence handoff |
| RSK11 | New project overwrites remaining user/planning work or creates a second copy of combat rules | High, preservation/integration | Q01; Git review; one canonical Runtime source consumed by .NET and Unity; no source-copy fork | P01/P05 gates |
| RSK12 | Proposal mistaken for approval or implemented code mistaken for device proof | High, scope/status integrity | Source-status catalog; current authorization in AGENTS/PROGRESS; explicit gate evidence; separate platform/capacity claims | Every phase |

## Nonblocking uncertainties to resolve at their consuming phase

- Working title, art details and exact animation can change without changing mechanics; use role/action IDs and simple placeholders in P02, with visible development status. Final content review is P07.
- Exact SDK patch, package test command flags and compatible isolated Python choice are P01/P03 outcomes, not fabricated in this plan. Unity 6.3 / AR Foundation 6.3.5 / Sentis 2.6.1 have documentation support, not local proof; see [DECISIONS.md](DECISIONS.md).
- Bot reaction delays, target tie breaks, mitigation stacking, shield refresh, Silence eligibility, no-target behavior and same-tick terminal order are bounded contract decisions in P02/P04 before training. Balance values are provisional, not statistically tuned.
- API compatibility is .NET Standard 2.1 for shared code; the exact supported CLI SDK can be chosen in P01. Persistence/transport codec need only support concrete logs/settings/snapshots; no generic event-sourcing service or database.
- LAN versus approved Relay can be settled after P03.M03. Relay, host migration, online spectators and full replay are not P0 dependencies.
- Minion speed/range/spawn behavior and five-human device supply are expansion gates. O01 spectator and O02 replay require scope decisions before new phases are authored.
- Project license, signing/distribution route and minimum supported OS versions are not established. Resolve before affected packaging/public-distribution commitments; these do not require inventing a store-release MVP or block authorized local foundation work.

## Gate policy

Provisional alternatives are documented, not quietly substituted: non-AR success does not pass AR; scripted fallback does not pass pure learned-AI; one platform does not pass proposed two-platform delivery; one network connection does not pass a complete raid; five simulated clients do not pass physical five-phone validation. Record failure and dependency-limited progress rather than claiming completion or starting unrelated scope.
