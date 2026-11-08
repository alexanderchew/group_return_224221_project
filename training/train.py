"""Train and evaluate two independent from-scratch CNNs in Python or a notebook."""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import time

from training.data import DatasetError, SPLITS, load_dataset, prepare_drafts, write_templates


def _json(path, value):
    Path(path).write_text(
        json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


def _weight_hash(model):
    value = hashlib.sha256()
    for weight in model.trainable_weights:
        value.update(weight.numpy().tobytes())
    return value.hexdigest()


def run_training(
    csv_path,
    task,
    output,
    *,
    epochs=30,
    batch_size=16,
    seed=42,
    max_chars=None,
    languages=("English", "Malay", "Chinese"),
    smoke_test=False,
    embedding_dim=64,
    filters=128,
    dense_units=64,
):
    # Reject bad data before importing TensorFlow or creating an output directory.
    data = load_dataset(csv_path, task, max_chars=max_chars, languages=languages)
    if data.contains_synthetic and not smoke_test:
        raise DatasetError(
            "Synthetic fixtures may only run with --smoke-test; they are not lecture evidence."
        )
    if task == "subject" and data.max_chars != 1000 and not smoke_test:
        raise DatasetError(
            "The current subject server uses 1000-character windows; keep --max-chars=1000."
        )
    if epochs < 1 or batch_size < 1:
        raise DatasetError("epochs and batch_size must be positive.")
    output = Path(output)
    if output.exists():
        raise DatasetError(
            "Use a new output directory; existing models/reports are never overwritten."
        )
    from training.network import build_cnn, keras, tf
    from training.metrics import choose_thresholds, evaluate
    import numpy as np

    output.mkdir(parents=True)
    arrays = {}
    for split in SPLITS:
        rows = data.partition(split)
        targets = (
            np.array([data.labels.index(row.target) for row in rows], dtype=np.int32)
            if task == "subject"
            else np.array([row.target for row in rows], dtype=np.float32)
        )
        # Each independent source family has equal total loss weight, including derivatives.
        counts = Counter(row.family_id for row in rows)
        weights = np.array([1 / counts[row.family_id] for row in rows], dtype=np.float32)
        weights /= weights.mean()
        arrays[split] = (rows, tf.constant([row.text for row in rows]), targets, weights)

    model = build_cnn(
        [row.text for row in arrays["train"][0]],
        classes=len(data.labels),
        multilabel=task == "language",
        max_chars=data.max_chars,
        embedding_dim=embedding_dim,
        filters=filters,
        dense_units=dense_units,
        seed=seed,
    )
    with (output / "architecture.txt").open("w") as stream:
        model.summary(print_fn=lambda line: stream.write(line + "\n"))
    initial_weights = _weight_hash(model)
    options = tf.data.Options()
    options.threading.private_threadpool_size = 1
    options.threading.max_intra_op_parallelism = 1

    def dataset(split, train=False):
        _, texts, targets, weights = arrays[split]
        value = tf.data.Dataset.from_tensor_slices((texts, targets, weights))
        if train:
            value = value.shuffle(len(targets), seed=seed, reshuffle_each_iteration=True)
        return value.batch(batch_size).with_options(options).prefetch(1)

    start = time.monotonic()
    history = model.fit(
        dataset("train", True),
        validation_data=dataset("val"),
        epochs=epochs,
        callbacks=[
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=5, restore_best_weights=True
            ),
            keras.callbacks.TerminateOnNaN(),
        ],
        verbose=2,
    )
    trained_weights = _weight_hash(model)
    if initial_weights == trained_weights:
        raise RuntimeError("Training did not change any network parameters.")
    model_path = output / "model.keras"
    model.save(model_path)
    loaded = keras.models.load_model(model_path, safe_mode=True, compile=False)
    sample = arrays["val"][1][: min(4, len(arrays["val"][0]))]
    np.testing.assert_allclose(
        model(sample, training=False).numpy(),
        loaded(sample, training=False).numpy(),
        rtol=1e-5,
        atol=1e-6,
    )

    def infer(split):
        texts = arrays[split][1]
        return np.concatenate(
            [
                loaded(texts[index : index + batch_size], training=False).numpy()
                for index in range(0, len(texts), batch_size)
            ]
        )

    val_scores = infer("val")
    thresholds = choose_thresholds(task, arrays["val"][2], val_scores)
    # Only now access the untouched test partition for the final frozen model report.
    test_scores = infer("test")
    test_metrics = evaluate(task, arrays["test"][2], test_scores, data.labels, thresholds)
    if task == "subject":
        majority = Counter(arrays["train"][2]).most_common(1)[0][0]
        baseline_scores = np.zeros_like(test_scores)
        baseline_scores[:, majority] = 1
    else:
        baseline_scores = np.broadcast_to(
            (arrays["train"][2].mean(axis=0) >= 0.5).astype(float), test_scores.shape
        )
    baseline = evaluate(
        task,
        arrays["test"][2],
        baseline_scores,
        data.labels,
        0.0 if task == "subject" else [0.5] * len(data.labels),
    )
    status = "synthetic_pipeline_smoke_test" if smoke_test else "user_annotated_lecture_experiment"
    versions = {
        name: importlib.metadata.version(name)
        for name in ("tensorflow", "keras", "numpy", "scikit-learn")
    }
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        commit = None
    manifest = {
        "version": f"{task}-char-cnn-{data.source_sha256[:8]}-{trained_weights[:8]}-seed{seed}",
        "task": task,
        "input_schema": "synthetic_smoke_unicode_text_v1"
        if smoke_test
        else ("unicode_text_v1" if task == "subject" else "unicode_language_text_v1"),
        "labels": data.labels,
        "threshold": thresholds if task == "subject" else None,
        "language_thresholds": thresholds if task == "language" else None,
        "window_chars": data.max_chars,
        "window_overlap": 0,
        "aggregation": "mean_window_scores" if task == "subject" else "segment_language_presence",
        "trained_from_scratch": True,
        "pretrained_weights": False,
        "preprocessing": "Original Unicode; Keras lowercase; characters; train-only vocabulary; preserve punctuation",
        "evidence_status": status,
        "production_eligible": False,
        "label_review": "provided_annotations_not_independently_certified",
        "dataset_sha256": data.source_sha256,
        "split_sha256": data.summary()["split_sha256"],
        "trained_roles": ["instruction"] if task == "subject" else "all reviewed language segments",
        "seed": seed,
        "versions": versions,
        "code_commit": commit,
        "code_source_sha256": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(Path(__file__).parent.glob("*.py"))
        },
        "requirements_sha256": hashlib.sha256(
            Path(__file__).with_name("requirements.txt").read_bytes()
        ).hexdigest(),
        "configuration": {
            "epochs": epochs,
            "batch_size": batch_size,
            "embedding_dim": embedding_dim,
            "filters": filters,
            "dense_units": dense_units,
            "max_chars": data.max_chars,
        },
        "initial_weights_sha256": initial_weights,
        "trained_weights_sha256": trained_weights,
        "model_sha256": hashlib.sha256(model_path.read_bytes()).hexdigest(),
        "limitations": [
            "No out-of-scope validation",
            "Scores are not calibrated confidence or speaking-time percentages",
            "Supporting examples can mislead the baseline subject CNN",
            "Human review is needed before live deployment",
        ],
    }
    report = {
        "evidence_status": status,
        "dataset": data.summary(),
        "test": test_metrics,
        "majority_or_prevalence_baseline": baseline,
        "validation": evaluate(task, arrays["val"][2], val_scores, data.labels, thresholds),
        "thresholds": thresholds,
        "threshold_source": "validation_only_not_probability_calibration",
        "unit_of_metrics": "reviewed_sections; source-family-disjoint splits; not chunk-random evaluation",
        "best_epoch": int(np.argmin(history.history["val_loss"]) + 1),
        "epochs_run": len(history.history["loss"]),
        "parameter_count": model.count_params(),
        "parameters_changed": True,
        "reload_parity": "passed",
        "seconds": time.monotonic() - start,
        "versions": versions,
        "paid_api_calls": 0,
    }
    _json(output / "manifest.json", manifest)
    source_dir = output / "source"
    source_dir.mkdir()
    for path in sorted(Path(__file__).parent.glob("*.py")):
        (source_dir / path.name).write_bytes(path.read_bytes())
    (source_dir / "requirements.txt").write_bytes(
        Path(__file__).with_name("requirements.txt").read_bytes()
    )
    _json(output / "report.json", report)
    _json(output / "history.json", history.history)
    _json(
        output / "test_predictions.json",
        [
            {
                "lecture_id": row.lecture_id,
                "family_id": row.family_id,
                "target": row.target,
                "scores": scores.tolist(),
            }
            for row, scores in zip(arrays["test"][0], test_scores, strict=True)
        ],
    )
    (output / "vocabulary.json").write_text(
        json.dumps(loaded.get_layer("characters").get_vocabulary(), ensure_ascii=False, indent=2)
        + "\n"
    )
    _plots(output, history.history, test_metrics, data.labels, status, task)
    print(
        json.dumps(
            {
                "output": str(output),
                "evidence_status": status,
                "test_macro_f1": test_metrics["macro_f1"],
                "production_eligible": False,
            },
            indent=2,
        )
    )
    return report


def _plots(output, history, metrics, labels, status, task):
    import tempfile

    os.environ.setdefault(
        "MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "lecture-cnn-matplotlib")
    )
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    axes[0].plot(history["loss"], label="train")
    axes[0].plot(history["val_loss"], label="validation")
    axes[0].set(xlabel="Epoch (zero-based)", ylabel="Loss")
    axes[0].legend()
    if task == "subject":
        axes[1].imshow(metrics["confusion_matrix"], cmap="Blues")
        axes[1].set(
            xticks=range(len(labels)),
            yticks=range(len(labels)),
            xticklabels=labels,
            yticklabels=labels,
            xlabel="Predicted",
            ylabel="Actual",
        )
        axes[1].tick_params(axis="x", rotation=40)
    else:
        axes[1].bar(labels, [metrics["per_language"][label]["f1-score"] for label in labels])
        axes[1].set(ylabel="Test F1", ylim=(0, 1))
    fig.suptitle(status)
    fig.tight_layout()
    fig.savefig(output / "evaluation.png", dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    template = sub.add_parser("templates")
    template.add_argument("directory", type=Path)
    prepare = sub.add_parser("prepare")
    prepare.add_argument("source", type=Path)
    prepare.add_argument("destination", type=Path)
    validate = sub.add_parser("validate")
    validate.add_argument("task", choices=("subject", "language"))
    validate.add_argument("csv", type=Path)
    train = sub.add_parser("train")
    train.add_argument("task", choices=("subject", "language"))
    train.add_argument("csv", type=Path)
    train.add_argument("--output", type=Path, required=True)
    train.add_argument("--epochs", type=int, default=30)
    train.add_argument("--batch-size", type=int, default=16)
    train.add_argument("--seed", type=int, default=42)
    train.add_argument("--max-chars", type=int)
    train.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "templates":
            print(*write_templates(args.directory), sep="\n")
        elif args.command == "prepare":
            print(*prepare_drafts(args.source, args.destination), sep="\n")
        elif args.command == "validate":
            print(json.dumps(load_dataset(args.csv, args.task).summary(), indent=2))
        else:
            run_training(
                args.csv,
                args.task,
                args.output,
                epochs=args.epochs,
                batch_size=args.batch_size,
                seed=args.seed,
                max_chars=args.max_chars,
                smoke_test=args.smoke_test,
            )
    except (DatasetError, FileNotFoundError) as error:
        parser.exit(2, f"Training blocked: {error}\n")


if __name__ == "__main__":
    main()
