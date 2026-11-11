"""SYNTHETIC SOFTWARE CHECK ONLY. These examples are not lecture training data."""

import argparse
import csv
from pathlib import Path

from training.train import run_training


def make_smoke_data(directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    subject_rows, language_rows = [], []
    subjects = {
        "Mathematics": "Solve the equation by finding the unknown variable. Factor the polynomial and calculate the roots of the quadratic.",
        "Geography": "Study the river basin and coastal landscape. Rainfall and erosion shape the valley and change the settlement pattern.",
        "PublicSpeaking": "Open the presentation with a promise. Explain the main idea clearly and use a pause to help the audience follow the talk.",
    }
    phrases = [
        ("Today we explain the lesson and review the example.", [1, 0, 0]),
        ("Hari ini kita belajar pelajaran dan membincangkan contoh.", [0, 1, 0]),
        ("今天我们学习这节课并且讨论这个例子。", [0, 0, 1]),
        ("Today we explain the lesson. Sekarang kita bincangkan contoh.", [1, 1, 0]),
        ("Today we explain the lesson. 现在我们讨论这个例子。", [1, 0, 1]),
        ("Hari ini kita belajar pelajaran. 现在我们讨论这个例子。", [0, 1, 1]),
        ("Today we learn. Sekarang kita belajar. 现在我们学习。", [1, 1, 1]),
    ]
    for split, count in (("train", 6), ("val", 2), ("test", 2)):
        for label, text in subjects.items():
            for index in range(count):
                lecture = f"SYNTHETIC_{label}_{split}_{index}"
                subject_rows.append(
                    [
                        lecture,
                        lecture,
                        f"{text} Exercise {split} {index}.",
                        "instruction",
                        label,
                        split,
                        "synthetic",
                    ]
                )
        for index, (text, labels) in enumerate(phrases):
            for variant in range(count):
                lecture = f"SYNTHETIC_language_{split}_{index}_{variant}"
                number = (
                    {"train": 10000, "val": 20000, "test": 30000}[split] + index * 100 + variant
                )
                language_rows.append(
                    [lecture, lecture, f"{text} ({number})", *labels, split, "synthetic"]
                )
    for name, header, rows in [
        (
            "subject_segments.csv",
            ["lecture_id", "source_family_id", "text", "role", "subject", "split", "data_kind"],
            subject_rows,
        ),
        (
            "language_segments.csv",
            [
                "lecture_id",
                "source_family_id",
                "text",
                "English",
                "Malay",
                "Chinese",
                "split",
                "data_kind",
            ],
            language_rows,
        ),
    ]:
        with (directory / name).open("w", encoding="utf-8", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(header)
            writer.writerows(rows)
    return directory


def run_smoke(data_dir, output_root, *, epochs=8):
    data_dir = make_smoke_data(data_dir)
    reports = {}
    for task in ("subject", "language"):
        reports[task] = run_training(
            data_dir / f"{task}_segments.csv",
            task,
            Path(output_root) / task,
            epochs=epochs,
            batch_size=8,
            smoke_test=True,
            embedding_dim=16,
            filters=24,
            dense_units=24,
        )
    return reports


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=8)
    args = parser.parse_args()
    run_smoke(args.data_dir, args.output, epochs=args.epochs)
