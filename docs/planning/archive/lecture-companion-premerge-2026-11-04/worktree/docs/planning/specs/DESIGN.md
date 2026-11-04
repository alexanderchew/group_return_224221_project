# Visual and interface design specification

Owner: Michelle; functional handoff/review with Ben. Scope: LC-12/13 plus readable capture/study/quiz behavior. This is a design contract for a functioning product, not approval of a particular brand or finished mockup.

## 1. Purpose and handoff

Make recording status unmistakable, processing understandable, and study material easy to review. Ben supplies working screens/components/states first; Michelle can redesign them without waiting for every backend feature. Use [FRONTEND.md](FRONTEND.md) for behavior and [SHARED_CONTRACTS.md](SHARED_CONTRACTS.md) for status meanings. Do not change API enums, scoring or recorder callbacks as styling work.

Deliver a small documented token system: semantic colors, typography, spacing, radii, elevation, borders, icon treatment and responsive breakpoints. Suggested visual direction is calm and readable with a neutral background, one primary accent, and clear success/warning/error states. Specific colors/logo/name remain proposals. Keep styling central enough to change without editing processing logic.

## 2. Required component inventory

Design Record/Pause/Resume/Stop/Process controls; input meter/timer; import drop zone/picker; session card/list row; stage/status badge; upload progress; transcript segment/source link; study section; subject confidence/unknown/manual override display; question/options; result/explanation; confirmation/dialog; and empty/error/offline/expired states.

For each component show default, focus, disabled, loading, success and error states where applicable. A “processing” spinner is not interchangeable with upload byte progress. An unknown subject must remain visually distinct from a confident predicted/overridden subject.

## 3. Screen composition

- Library: prominent Record/Import, readable session title/date/duration/state, clear open/delete actions; efficient on phone and desktop.
- Recorder: persistent active state, visible elapsed audio and input indicator; Stop always readily reachable. Paused/interrupted must look different from actively recording.
- Processing: clear stage sequence and saved-source reassurance; specific failed-stage recovery action, with no fake countdown.
- Study workspace: phone-friendly tabs/sections; desktop optional transcript beside notes/quiz. Keep source links and result freshness visible without overwhelming reading.
- Transcript: clear timestamps/speaker labels, comfortable multilingual text, selected playback segment, search and correction affordances.
- Quiz/results: large labeled option targets, selection state, answer progress, explicit submit, and explanations/evidence after scoring. Do not expose correct-option cues before submission.

## 4. Accessibility and content

Proposed targets: at least 44×44 logical-pixel primary touch areas; 4.5:1 normal-text contrast and 3:1 large-text/UI contrast where applicable; visible keyboard focus; meaningful screen-reader names/announcements; usable text scaling; reduced-motion support. These are design targets requiring measurement, not a claim of certified conformance.

Use text/icons alongside color, preserve reading order and avoid hover-only actions. A waveform is supplemental to timer/status. Display mathematics/units and Mandarin/Malay/English content without clipping or inappropriate forced capitalization. Long titles, hour-scale times and large transcripts must fit without hiding controls. Loading/error text explains the next available action using product language, not internal queue/vendor details.

## 5. Change boundaries and acceptance

Michelle may alter tokens, layout, typography, iconography, illustrations and presentation components. Preserve semantic roles, callbacks, local save state, permission handling, progress accuracy, warning visibility, source navigation, revision labels, quiz scoring and mobile safe areas. Behavior changes are reviewed with Ben/Alex and recorded in the owning spec.

Handoff consists of token/component definitions and phone/desktop examples for recording, processing, a complete study session and quiz results, including empty/error states. Review the implemented UI on both iPhone/iOS and Android plus the selected desktop browser, using keyboard/text scaling/screen-reader checks as available. Session durations normally show 30–60-minute lessons but must format up to ten hours. Display a clear US$20 shared-budget warning/block state without any client-side provider-key form; Alex enters keys in the laptop terminal. The design is accepted only after functional flows still work; attractive static screens do not establish frontend completion.
