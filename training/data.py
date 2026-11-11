"""Validate human-reviewed annotations before any vocabulary fitting or training."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

SPLITS = ("train", "val", "test")
ROLES = {"instruction", "supporting_example", "administration", "unrelated"}


class DatasetError(ValueError):
    """A dataset cannot support the requested independent evaluation."""


@dataclass(frozen=True)
class Example:
    lecture_id: str
    family_id: str
    split: str
    text: str
    target: str | tuple[int, ...]


@dataclass
class Dataset:
    task: str
    labels: list[str]
    examples: list[Example]
    source_sha256: str
    max_chars: int
    excluded_rows: int
    contains_synthetic: bool = False

    def partition(self, split: str) -> list[Example]:
        return [example for example in self.examples if example.split == split]

    def summary(self) -> dict:
        result = {}
        for split in SPLITS:
            rows = self.partition(split)
            result[split] = {
                "sections": len(rows),
                "lectures": len({x.lecture_id for x in rows}),
                "source_families": len({x.family_id for x in rows}),
                "positive_families_per_label": {
                    label: len(
                        {
                            x.family_id
                            for x in rows
                            if (
                                x.target == label
                                if self.task == "subject"
                                else x.target[index] == 1
                            )
                        }
                    )
                    for index, label in enumerate(self.labels)
                },
            }
        return {
            "task": self.task,
            "labels": self.labels,
            "partitions": result,
            "contains_synthetic": self.contains_synthetic,
            "excluded_noninstruction_rows": self.excluded_rows,
            "source_sha256": self.source_sha256,
            "split_sha256": hashlib.sha256(
                json.dumps(
                    sorted({(x.lecture_id, x.family_id, x.split) for x in self.examples})
                ).encode()
            ).hexdigest(),
            "warnings": [
                "Small source counts produce preliminary results, not a reliable accuracy claim."
            ]
            if any(value < 20 for value in result["train"]["positive_families_per_label"].values())
            else [],
        }


def load_dataset(
    path: str | Path,
    task: str,
    *,
    max_chars: int | None = None,
    languages: tuple[str, ...] = ("English", "Malay", "Chinese"),
) -> Dataset:
    if task not in {"subject", "language"}:
        raise DatasetError("Task must be subject or language.")
    path = Path(path)
    raw = path.read_bytes()
    max_chars = max_chars or (1000 if task == "subject" else 240)
    if max_chars < 5:
        raise DatasetError("max_chars must be at least 5.")
    rows = list(csv.DictReader(raw.decode("utf-8-sig").splitlines(keepends=True)))
    if not rows:
        raise DatasetError("The CSV is empty. Add reviewed lecture sections before training.")
    if any(None in row for row in rows):
        raise DatasetError("A CSV row has extra fields. Quote transcript text containing commas.")
    rows = [
        {
            str(key).strip().lower(): (value or "").strip()
            for key, value in row.items()
            if key is not None
        }
        for row in rows
    ]
    required = {"lecture_id", "text", "split"} | (
        {"subject", "role"} if task == "subject" else {name.lower() for name in languages}
    )
    if missing := required - rows[0].keys():
        raise DatasetError(f"Missing CSV columns: {', '.join(sorted(missing))}")
    if task == "language" and (len(languages) < 2 or len(set(languages)) != len(languages)):
        raise DatasetError("Supply at least two distinct language label columns.")
    groups, lectures, duplicates, examples, excluded = {}, {}, {}, [], 0
    for number, row in enumerate(rows, 2):
        lecture = row["lecture_id"]
        family = row.get("source_family_id") or lecture
        split, text = row["split"], row["text"]
        if not lecture or not text or split not in SPLITS:
            raise DatasetError(
                f"Row {number}: lecture_id/text and a train/val/test split are required."
            )
        if family in groups and groups[family] != split:
            raise DatasetError(f"Row {number}: source family {family!r} crosses splits.")
        if lecture in lectures and lectures[lecture] != (family, split):
            raise DatasetError(f"Row {number}: lecture {lecture!r} has inconsistent family/split.")
        groups[family], lectures[lecture] = split, (family, split)
        if task == "subject":
            if row["role"] not in ROLES:
                raise DatasetError(f"Row {number}: manually review role; choose {sorted(ROLES)}.")
            if row["role"] != "instruction":
                excluded += 1
                continue
            target = row["subject"]
            if not target:
                raise DatasetError(f"Row {number}: instructional sections need a reviewed subject.")
        else:
            values = [row[name.lower()] for name in languages]
            if any(value not in {"0", "1"} for value in values):
                raise DatasetError(f"Row {number}: every language label must be a reviewed 0 or 1.")
            target = tuple(int(value) for value in values)
            if not any(target):
                raise DatasetError(f"Row {number}: label at least one supported language.")
        if len(text) > max_chars:
            raise DatasetError(
                f"Row {number}: {len(text)} characters exceeds {max_chars}; segment and review it first."
            )
        key = re.sub(r"\s+", " ", unicodedata.normalize("NFC", text).lower()).strip()
        if key in duplicates:
            old_split, old_target = duplicates[key]
            if old_split != split:
                raise DatasetError(f"Row {number}: duplicate text leaks across splits.")
            if old_target != target:
                raise DatasetError(f"Row {number}: duplicate text has conflicting labels.")
            continue
        duplicates[key] = (split, target)
        examples.append(Example(lecture, family, split, text, target))
    if not examples:
        raise DatasetError("No eligible reviewed examples remain.")
    train = [x for x in examples if x.split == "train"]
    labels = sorted({x.target for x in train}) if task == "subject" else list(languages)
    if len(labels) < 2:
        raise DatasetError("Training needs at least two subject/language classes.")
    dataset = Dataset(
        task,
        labels,
        examples,
        hashlib.sha256(raw).hexdigest(),
        max_chars,
        excluded,
        any(
            row.get("data_kind", "").lower() in {"synthetic", "example", "fixture"} for row in rows
        ),
    )
    for split in SPLITS:
        part = dataset.partition(split)
        if not part:
            raise DatasetError(
                f"{split} is empty; independent train/val/test sources are required."
            )
        if task == "subject":
            if {x.target for x in part} != set(labels):
                raise DatasetError(f"{split} must cover the same subjects as training.")
        else:
            for index, label in enumerate(labels):
                if {x.target[index] for x in part} != {0, 1}:
                    raise DatasetError(f"{split} needs positive and negative examples for {label}.")
    return dataset


def write_templates(directory: str | Path) -> list[Path]:
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    paths = []
    for name, columns in {
        "subject_segments.csv": [
            "lecture_id",
            "source_family_id",
            "text",
            "role",
            "subject",
            "split",
        ],
        "language_segments.csv": [
            "lecture_id",
            "source_family_id",
            "text",
            "English",
            "Malay",
            "Chinese",
            "split",
        ],
    }.items():
        path = directory / name
        with path.open("x", encoding="utf-8", newline="") as stream:
            csv.writer(stream).writerow(columns)
        paths.append(path)
    return paths


def prepare_drafts(source: str | Path, destination: str | Path) -> list[Path]:
    """Extract private annotation drafts; never guess subject/activity/language/split labels."""
    source, destination = Path(source), Path(destination)
    files = sorted(source.rglob("*.txt"))
    if not files:
        raise DatasetError("No .txt transcripts found; UTF-8 original-language text is required.")
    paths = write_templates(destination)
    source_index = []
    for path in files:
        text = path.read_text(encoding="utf-8-sig").strip()
        lecture = (
            "lecture_" + hashlib.sha256(str(path.relative_to(source)).encode()).hexdigest()[:12]
        )
        source_index.append(
            {
                "lecture_id": lecture,
                "source_file": str(path.relative_to(source)),
                "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
        for output, width, blanks in [
            (paths[0], 1000, ["", "", ""]),
            (paths[1], 240, ["", "", "", ""]),
        ]:
            with output.open("a", encoding="utf-8", newline="") as stream:
                writer = csv.writer(stream)
                for index in range(0, len(text), width):
                    if section := text[index : index + width].strip():
                        writer.writerow([lecture, lecture, section, *blanks])
    index_path = destination / "source_index.json"
    with index_path.open("x", encoding="utf-8") as stream:
        json.dump(source_index, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    return paths + [index_path]
