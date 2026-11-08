import csv
import json

import pytest

from training.data import DatasetError, load_dataset, prepare_drafts, write_templates
from training.smoke import make_smoke_data


@pytest.fixture
def data(tmp_path):
    return make_smoke_data(tmp_path / "SYNTHETIC_FIXTURES")


def change(path, transform):
    with path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        header = reader.fieldnames
        rows = list(reader)
    transform(rows)
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)


def test_independent_source_counts_and_multilingual_labels(data):
    subject = load_dataset(data / "subject_segments.csv", "subject")
    language = load_dataset(data / "language_segments.csv", "language")
    assert subject.contains_synthetic
    assert subject.summary()["partitions"]["train"]["source_families"] == 18
    assert language.labels == ["English", "Malay", "Chinese"]
    assert (1, 1, 1) in {x.target for x in language.examples}


def test_source_family_leakage_rejected(data):
    path = data / "subject_segments.csv"
    change(path, lambda rows: rows[-1].update(source_family_id=rows[0]["source_family_id"]))
    with pytest.raises(DatasetError, match="crosses splits"):
        load_dataset(path, "subject")


def test_same_lecture_cannot_change_family_or_split(data):
    path = data / "subject_segments.csv"
    change(path, lambda rows: rows[-1].update(lecture_id=rows[0]["lecture_id"]))
    with pytest.raises(DatasetError, match="inconsistent family/split"):
        load_dataset(path, "subject")


def test_duplicate_text_cannot_cross_splits(data):
    path = data / "subject_segments.csv"
    change(path, lambda rows: rows[-1].update(text=rows[0]["text"]))
    with pytest.raises(DatasetError, match="leaks across splits"):
        load_dataset(path, "subject")


def test_supporting_examples_are_not_mislabeled_as_instruction(data):
    path = data / "subject_segments.csv"
    change(path, lambda rows: rows[0].update(role="supporting_example", subject="Physics"))
    value = load_dataset(path, "subject")
    assert "Physics" not in value.labels
    assert value.excluded_rows == 1


def test_unreviewed_drafts_block_training(tmp_path):
    source = tmp_path / "transcripts"
    source.mkdir()
    (source / "lecture.txt").write_text("This is one lecture. 这是课堂内容。", encoding="utf-8")
    files = prepare_drafts(source, tmp_path / "drafts")
    index = json.loads(files[2].read_text())
    assert index[0]["source_file"] == "lecture.txt"
    assert index[0]["lecture_id"] in files[0].read_text()
    with pytest.raises(DatasetError, match="train/val/test"):
        load_dataset(files[0], "subject")
    with pytest.raises(FileExistsError):
        write_templates(tmp_path / "drafts")


def test_unknown_test_subject_is_not_silently_added_to_labels(data):
    path = data / "subject_segments.csv"
    change(path, lambda rows: rows[-1].update(subject="UnknownSubject"))
    with pytest.raises(DatasetError, match="same subjects"):
        load_dataset(path, "subject")


def test_no_silent_character_truncation(data):
    path = data / "subject_segments.csv"
    change(path, lambda rows: rows[0].update(text="长" * 1001))
    with pytest.raises(DatasetError, match="segment and review"):
        load_dataset(path, "subject")


@pytest.mark.parametrize("bad", ["", "0.5", "English"])
def test_languages_need_binary_reviewed_labels(data, bad):
    path = data / "language_segments.csv"
    change(path, lambda rows: rows[0].update(English=bad))
    with pytest.raises(DatasetError, match="reviewed 0 or 1"):
        load_dataset(path, "language")


def test_synthetic_training_requires_explicit_smoke_mode(data, tmp_path):
    from training.train import run_training

    with pytest.raises(DatasetError, match="Synthetic fixtures"):
        run_training(data / "subject_segments.csv", "subject", tmp_path / "unallowed")
    assert not (tmp_path / "unallowed").exists()
