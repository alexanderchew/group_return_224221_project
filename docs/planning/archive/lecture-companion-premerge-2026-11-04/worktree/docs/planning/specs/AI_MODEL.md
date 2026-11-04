# Team model and dataset specification

Owner: shared team; one data/training lead and one reviewer to confirm. Scope: LC-09/14/20/22. [Numerical proposals](../SCOPE_BASELINE.md#proposed-configuration-packs) are CFG-03; this document defines their interpretation and the evidence needed. No model, labels, dataset or training run currently exists in the checkout.

## 1. Task and taxonomy

Input: transcript text from a saved revision, divided into bounded source-linked windows. Output: agreed subject scores and either an accepted subject or explicit abstention. First model is a subject classifier. Detecting spoken language is a separate provider/metadata function. A Physics explanation in Mandarin remains Physics.

Proposed first taxonomy is 3–5 distinct subjects with sufficient data, selected by the team rather than automatically taken from examples. Decide whether Science is a superclass or whether Biology/Chemistry/Physics are separate classes; do not mix overlapping label definitions casually. Also define non-teaching/out-of-scope and mixed/insufficient-content annotation rules. An abstention threshold can reject uncertainty without requiring an “everything else” training class, but evaluate false acceptance on unknown material explicitly.

IGCSE describes the audience, not a universal label list. Board/year/tier/topic codes are optional declared metadata until the team approves source-backed syllabus mapping. User subject hints, file names and directory labels must not be included in predictive text.

## 2. Dataset and permissions

Each independent source group records `group_id`, original lecture/session ID, source family, teacher/speaker pseudonym when known, language/code-switching, subject label, text/span, recording permission, training-use permission, provenance and reviewer state. Keep private audio/text outside Git. Commit only authorized non-sensitive fixtures, annotation schema and aggregate manifests as appropriate after implementation approval.

Collection should represent the actual use case: imperfect lecture transcriptions, not just polished textbook paragraphs. Include quiet sections, questions/examples, short excerpts and code-switching if in scope. The proposed independent-group counts are planning targets, not a promise that the sample size will yield stable quality. If there are too few lectures, reduce classes or report the experiment as preliminary; do not multiply excerpts to imply independent data volume.

Prepare an annotation guide with inclusion/exclusion and borderline examples. One reviewer labels all groups; a second checks a representative slice and every disputed example. Record disagreement and its resolution. Synthetic/LLM-assisted labels and paraphrases are identified as such; they do not substitute for a human-reviewed held-out real-recording set. Do not silently reuse ordinary user uploads for training.

## 3. Split before windowing

1. Group near-duplicates, excerpts from the same lesson, alternate transcriptions, translations, processed audio variants and paraphrases into a common source family.
2. Partition whole groups into train/validation/test with subject representation, following CFG-03 where data permits; save group lists and seed.
3. Where possible hold out teachers, recording conditions and later dates as a separate generalization check.
4. Generate bounded windows inside each partition only. Overlapping windows remain in their parent partition.
5. Adapt vocabulary/vectorization/normalization, fit class weights and train exclusively on training data. Tune architecture, stopping and abstention/calibration on validation.
6. Freeze the model/thresholds before final test evaluation. If test results lead to model changes, record that use and establish a new untouched final test set when feasible.

Audit hashes/text similarity and source IDs across partitions. Never claim generalization from randomly separated windows of one lecture. Report both window and lecture-level metrics with clear denominators; a large number of windows does not increase the independent lecture count.

## 4. Baselines and first TensorFlow model

Measure majority-class and keyword baselines, and a TF-IDF linear classifier as a strong non-neural comparison. Baselines are evaluation tools; the final requirement is a genuinely trained TensorFlow/Keras model, not a renamed linear baseline or LLM call.

First trainable candidate: Unicode-aware vectorization of transcript text followed by a small dense Keras classifier. Preserve domain tokens such as units/formulas when possible; document character/token normalization, vocabulary size, text-window rule, architecture, loss, optimizer, regularization, seed and stopping condition. Word-only whitespace tokenization may fail on Mandarin; use an evaluated character/subword representation when mixed-language input is adopted.

Package the vectorizer with the model or as a versioned inseparable preprocessor. The official TensorFlow [text-classification tutorial](https://www.tensorflow.org/tutorials/keras/text_classification) supports the general vectorization/training pattern and identical training/serving preprocessing; it does not establish performance on these lessons.

If the initial model is inadequate, compare an evaluated pretrained multilingual representation with a trainable classification head, recording which weights were trained and which remained frozen. Do not promise a particular downloaded preset or on-device runtime without verifying its existence, license, preprocessing and compatibility. Bigger architecture is not a substitute for reviewed data.

## 5. Windowing, aggregation and abstention

Define one fixed text-window/token policy with bounded length and source references. Inference covers the whole transcript rather than only its beginning. For overlapping windows, weight only owned content when aggregating so repeated context is not overcounted. Evaluate window disagreement and amount of usable content.

A candidate session decision averages/weights accepted window scores, then applies validation-selected top-score, margin and disagreement/coverage rules. Mixed subjects or insufficient usable text yield abstention/uncertain status. Confidence values are not described as calibrated probabilities without a calibration analysis. Record raw prediction separately from any user override.

Out-of-distribution detection is limited: high softmax confidence can still be wrong. Challenge the system with meetings, silence/ASR noise, unrelated subjects and mixtures. A successful uncertainty detector is not proof of universal unknown detection. Missing/incompatible model artifacts return `unavailable` or `failed`; they do not emit guessed labels.

## 6. Evaluation and acceptance

Required evidence: number of independent groups per split/class, window counts, label definitions, class balance, macro/weighted F1, per-class precision/recall, confusion matrix, accuracy and baseline comparisons. Report slice performance for agreed languages/code-switching and known/unseen speakers where data allows. Inspect errors and distinguish ASR errors from classifier errors by comparing corrected text on a separate diagnostic analysis.

Evaluate abstention honestly: all supported-subject test examples remain in the main denominator, with abstained known examples treated as missed predictions. Separately report selective precision among accepted predictions and coverage over all known examples. On the separate out-of-scope set report false acceptance. Thresholds come from validation, not from inspecting final test labels.

CFG-03 gives proposed release targets. Report exact sample counts and uncertainty, ideally grouped bootstrap intervals where enough independent groups exist; small test sets do not justify precise broad claims. An honest missed target remains a failed/unmet gate, not an invitation to omit hard examples. Compare at matched coverage where meaningful.

Generation quality and quiz factual accuracy are separate evaluations. Subject F1 does not measure note quality, student learning or exam performance. Any later concept/dialogue/question-selection model needs its own explicit task/labels, group-split data, baselines and independent evaluation gate.

## 7. Artifact and serving contract

Deliver a model bundle containing weights/export, preprocessing, class-label mapping, thresholds, dataset/split manifests and hashes, training configuration/history, code/environment version and evaluation/model card. Bundle compatibility includes input schema, window policy, text normalization and label version; a bare weights file is insufficient.

Initial inference runs server-side in the worker on Alex’s current laptop, keeping iPhone/iOS, Android and web clients independent of TensorFlow packages. At authorized setup use the latest stable TensorFlow/Keras release compatible with the laptop and selected supported Python runtime, then pin and record the resolved versions; do not assume the newest Python release is supported. Local inference/training does not consume paid transcription/generation allowance, but any paid data-processing requests share the same total US$20 budget. Load once, run deterministic preprocessing, validate output shape/order/finite scores and return the shared prediction object. Save a hash/model version with every result. Parity checks compare training evaluation, reloaded model and the serving adapter on fixed reviewed examples.

Missing or incompatible bundles cannot be credited as a trained-model run. Retain the last known validated bundle for rollback, explicitly record which bundle generated old predictions, and avoid changing model files beneath an active job. No new model is installed automatically from untrusted uploaded content.

## 8. Team handoff and demonstration

The model lead hands Alex a tested bundle and sample input/output contracts; Alex integrates it without rewriting labels/tokenization. Ben displays accepted/uncertain/missing/failed states and manual overrides without relabeling them. The team presentation shows an independent recording, inference result, data separation, baseline comparison and a representative error. Training screenshots alone do not prove deployed inference.

Design windowing/evaluation around typical 30–60-minute lessons while testing full coverage up to the ten-hour maximum. Resolve Q01, Q04, Q05 and Q07 before a substantial collection/training effort. Model work can proceed alongside D0 UI/backend work once those task boundaries and authorized source data are established.
