"""Generate the clean portable notebook from maintained training modules."""

from pathlib import Path

import nbformat as nbf


def create_notebook():
    notebook = nbf.v4.new_notebook()
    notebook.metadata.update(
        kernelspec={"display_name": "Python 3", "language": "python", "name": "python3"},
        language_info={"name": "python", "version": "3.12"},
    )
    markdown, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell
    notebook.cells = [
        markdown("""# From-scratch lecture subject and language CNNs

This notebook implements the requirements in **Alex's owner spec, section 9**.
Each network learns its own character embedding and Conv1D weights. No pretrained
model, pretrained vocabulary, ChatGPT classifier or paid provider is used.

**Real training requires your reviewed transcripts.** The repository contains no
private lecture dataset. `RUN_MODE='smoke'` checks the software using artificial
examples and produces artifacts explicitly ineligible for deployment. Its scores
are not evidence of lecture-recognition quality.

In Colab, first upload or check out the repository version containing `training/`.
Private data should be uploaded only when you deliberately choose to do so; this
notebook performs no automatic upload. In local Jupyter, select the isolated
training environment described in the root README."""),
        code("""from pathlib import Path
from datetime import datetime, timezone
import sys

ROOT = Path.cwd()
if not (ROOT / 'training').is_dir():
    ROOT = ROOT.parent
assert (ROOT / 'training/network.py').exists(), 'Set ROOT to the repository directory.'
sys.path.insert(0, str(ROOT))

RUN_MODE = 'real'  # Keep real for your annotated lectures; smoke is a software check only.
DATA_DIR = ROOT / 'var/training-data'
RUN_ID = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
OUTPUT_ROOT = ROOT / 'var/models' / f'{RUN_MODE}-{RUN_ID}'
EPOCHS = 30
BATCH_SIZE = 16
SEED = 42
INSTALL_DEPENDENCIES = False  # Set True in a fresh Colab runtime before importing TensorFlow.
"""),
        markdown("""## Environment

`training/requirements.txt` pins the resolved compatible TensorFlow/Keras set and
dependencies with hashes. Use Python 3.12 or 3.13. In a fresh Colab runtime set
`INSTALL_DEPENDENCIES=True`; if this replaces already-imported TensorFlow, restart
the runtime before proceeding. Local Jupyter should use the prepared training
kernel, with this flag left False."""),
        code("""if INSTALL_DEPENDENCIES:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--require-hashes',
                           '-r', str(ROOT / 'training/requirements.txt')])
import importlib.metadata
print({name: importlib.metadata.version(name) for name in ('tensorflow', 'keras', 'numpy')})
"""),
        markdown("""## Annotate and validate your data

Subject CSV: `lecture_id,source_family_id,text,role,subject,split`.
Language CSV: `lecture_id,source_family_id,text,English,Malay,Chinese,split`.
Language columns are independent 0/1 labels, so mixed sections can have multiple 1s.

Every derivative of an original source must share its `source_family_id` and split.
Use `train`, `val`, `test` (roughly 70/15/15 where independent class coverage allows).
Subject roles are `instruction`, `supporting_example`, `administration`, `unrelated`.
Only reviewed instructional sections train the first subject model. Do not label
a physics example in a public-speaking lecture as a Physics lesson automatically.

Review subject sections of at most 1000 characters, matching the backend window.
Review short language phrases/sections of at most 240 characters; never copy all
languages in a lecture onto every section. Overlong examples are rejected, not
silently truncated. Original-language text is required; translated English cannot
establish the original spoken language. Chinese here is a written-language label,
not automatic identification of a spoken variety such as Mandarin or Cantonese.

The validator checks structure/leakage, not the truth of a human annotation."""),
        code("""from training.data import load_dataset
if RUN_MODE == 'smoke':
    from training.smoke import make_smoke_data
    DATA_DIR = make_smoke_data(ROOT / 'var' / f'SYNTHETIC-notebook-{RUN_ID}')
    print('SYNTHETIC SOFTWARE CHECK: not real lecture training or quality evidence.')
elif RUN_MODE != 'real':
    raise ValueError('Choose real or smoke explicitly.')

datasets = {task: load_dataset(DATA_DIR / f'{task}_segments.csv', task)
            for task in ('subject', 'language')}
for task, data in datasets.items():
    print(task, data.summary())
"""),
        markdown("""## Architecture

Original text → training-only character vocabulary → randomly initialized
Embedding → Conv1D → GlobalMaxPooling → Dense → Dropout → output.

Subjects use softmax and sparse categorical cross-entropy. Languages use
independent sigmoid outputs and binary cross-entropy. The language network has
its own weights and vocabulary. Both vocabularies are adapted only on training text.
Punctuation, mathematical symbols and original Unicode are preserved; the model
performs lowercase character vectorization. Exact architecture source follows."""),
        code("""import inspect
from training.network import build_cnn
print(inspect.getsource(build_cnn))
"""),
        markdown("""## Train both networks

Training balances each source family's total loss weight across its sections. Validation
loss controls early stopping; restored weights are saved before the untouched test
partition is evaluated. Thresholds come from validation only. No live application
is changed, and no model is automatically installed on the server."""),
        code("""from training.train import run_training
reports = {}
for task in ('subject', 'language'):
    reports[task] = run_training(
        DATA_DIR / f'{task}_segments.csv', task, OUTPUT_ROOT / task,
        epochs=EPOCHS, batch_size=BATCH_SIZE, seed=SEED,
        smoke_test=(RUN_MODE == 'smoke'),
    )
"""),
        markdown("""## Inspect held-out results

Read per-class precision/recall/F1, macro F1, subject confusion matrix, language
exact-match and mixed-language results, and the majority/prevalence baseline.
Section metrics use source-disjoint groups; these are not full-lecture or unknown-
subject validation. Tiny source counts remain preliminary. Synthetic scores are
only software checks. Do not tune repeatedly against this final test set."""),
        code("""from IPython.display import Image, display
for task, report in reports.items():
    print(task, report['evidence_status'])
    print('Test:', report['test'])
    print('Baseline:', report['majority_or_prevalence_baseline'])
    print('Reload parity:', report['reload_parity'])
    display(Image(filename=str(OUTPUT_ROOT / task / 'evaluation.png')))
"""),
        markdown("""## Reload and predict locally

The saved `.keras` file includes its vectorizer. Labels, thresholds, hashes,
versions, history and reports are saved beside it. Language scores indicate
presence, not percentages of speaking time. Low subject scores abstain; this is
not a validated universal unknown detector. The local preview below uses a
validation section rather than tuning on the final test set."""),
        code("""from training.predict import predict_bundle
for task, data in datasets.items():
    result = predict_bundle(OUTPUT_ROOT / task, data.partition('val')[0].text,
                            allow_smoke=(RUN_MODE == 'smoke'))
    print(result)
"""),
        markdown("""## Handoff

Real subject exports use the existing `unicode_text_v1` model interface, labels
and 1000-character windows. Smoke exports deliberately use an incompatible input
schema so the production subject adapter rejects them. Language exports use a
separate schema and are not connected to the subject API.

All exports remain `production_eligible=False` pending human review, real held-out
evidence and an explicit deployment decision. Keep raw data, executed notebooks
containing private results, and models outside Git, under ignored `var/` paths.
See Alex's spec for the shared API, delivery gates and remaining decisions."""),
    ]
    notebook.cells[1].metadata["tags"] = ["configuration"]
    return notebook


if __name__ == "__main__":
    destination = Path(__file__).with_name("Lecture_Classifier_Training.ipynb")
    notebook = create_notebook()
    nbf.validate(notebook)
    nbf.write(notebook, destination)
    print(destination)
