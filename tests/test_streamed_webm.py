"""Real streaming-container regression: no providers and no network."""
import json
import subprocess
from pathlib import Path

import pytest

from lecture_backend.core import Problem, Settings
from lecture_backend.media import file_digest, probe


@pytest.fixture
def streamed_webm(tmp_path):
    path = tmp_path / "streamed.webm"
    # Actual MediaRecorder output from Chrome's synthetic microphone, not a lecture.
    source = Path(__file__).resolve().parents[1] / "fixtures/regressions/chrome-mediarecorder-headerless.webm"
    path.write_bytes(source.read_bytes())
    metadata = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-of", "json", str(path)],
        capture_output=True, check=True, timeout=30,
    )
    assert "duration" not in json.loads(metadata.stdout)["format"]
    return path


def test_streamed_webm_decodes_without_changing_original(streamed_webm, tmp_path):
    before = file_digest(streamed_webm)
    result = probe(streamed_webm, Settings(data_dir=tmp_path / "demo"))
    assert result["mime_type"] == "audio/webm"
    assert 1 < result["duration_seconds"] < 3
    assert result["sha256"] == before == file_digest(streamed_webm)


def test_streamed_webm_still_enforces_active_duration_limit(streamed_webm, tmp_path):
    with pytest.raises(Problem) as error:
        probe(streamed_webm, Settings(data_dir=tmp_path / "demo", max_duration_seconds=0.5))
    assert error.value.code == "duration_limit"
