"""Local exploratory inference; this command never installs a model in the API."""

import argparse
import hashlib
import json
from pathlib import Path


def predict_bundle(directory, text, *, allow_smoke=False):
    directory = Path(directory)
    manifest = json.loads((directory / "manifest.json").read_text())
    if manifest["evidence_status"] == "synthetic_pipeline_smoke_test" and not allow_smoke:
        raise ValueError(
            "This is a synthetic smoke-test artifact, not a lecture model. Use --allow-smoke only for software verification."
        )
    if (
        hashlib.sha256((directory / "model.keras").read_bytes()).hexdigest()
        != manifest["model_sha256"]
    ):
        raise ValueError("The model checksum does not match its manifest.")
    text = text.strip()
    if not text:
        raise ValueError("An original-language transcript is required.")
    from training.network import keras, tf
    import numpy as np

    model = keras.models.load_model(directory / "model.keras", safe_mode=True, compile=False)
    width = manifest["window_chars"]
    windows = [text[i : i + width] for i in range(0, len(text), width)]
    scores = np.concatenate(
        [
            model(tf.constant(windows[start : start + 16]), training=False).numpy()
            for start in range(0, len(windows), 16)
        ]
    )
    if scores.shape != (len(windows), len(manifest["labels"])) or not np.isfinite(scores).all():
        raise ValueError("Invalid model outputs.")
    result = {
        "task": manifest["task"],
        "evidence_status": manifest["evidence_status"],
        "model_version": manifest["version"],
        "windows": len(windows),
        "production_eligible": False,
    }
    if manifest["task"] == "subject":
        average = scores.mean(axis=0)
        index = int(average.argmax())
        result.update(
            label=manifest["labels"][index] if average[index] >= manifest["threshold"] else None,
            scores=dict(zip(manifest["labels"], average.tolist(), strict=True)),
        )
    else:
        result["segments"] = [
            {
                "index": index,
                "languages": [
                    label
                    for label, value, threshold in zip(
                        manifest["labels"], row, manifest["language_thresholds"], strict=True
                    )
                    if value >= threshold
                ],
                "scores": dict(zip(manifest["labels"], row.tolist(), strict=True)),
            }
            for index, row in enumerate(scores)
        ]
        result["scores_are_speaking_time_percentages"] = False
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("text_file", type=Path)
    parser.add_argument("--allow-smoke", action="store_true")
    args = parser.parse_args()
    print(
        json.dumps(
            predict_bundle(
                args.bundle,
                args.text_file.read_text(encoding="utf-8"),
                allow_smoke=args.allow_smoke,
            ),
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
