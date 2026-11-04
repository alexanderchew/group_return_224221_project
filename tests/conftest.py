"""Contract tests use labeled deterministic provider doubles; no paid service is called."""
import io
import wave
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from lecture_backend.app import create_app
from lecture_backend.core import Problem, Settings
from lecture_backend.schemas import GeneratedPack


@pytest.fixture(autouse=True)
def block_external_http(monkeypatch):
    """In-process API tests work; real HTTP/provider traffic always fails closed."""
    def blocked(*args, **kwargs):
        raise AssertionError("Offline tests must not send real HTTP requests.")

    async def blocked_async(*args, **kwargs):
        blocked()

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", blocked)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", blocked_async)


class TestProviders:
    __test__ = False

    def __init__(self):
        self.transcriptions = 0
        self.generations = 0
        self.fail_generation = False
        self.on_generate = None

    def configured(self):
        return {"elevenlabs": True, "openai": True}

    def transcribe(self, path, duration, job_id):
        self.transcriptions += 1
        return {"text": "Photosynthesis uses light energy. Chlorophyll in green plants absorbs light to make glucose."}

    def generate(self, segments, subject_hint, job_id):
        self.generations += 1
        if self.on_generate:
            self.on_generate()
        if self.fail_generation:
            raise Problem("test_generation_failure", "Deliberate test provider failure.", 503)
        refs = [segments[0]["id"]]
        value = {"subject": "Biology", "metadata": {"title": "Photosynthesis", "description": "Plants use light.", "evidence_segment_ids": refs,
                 "topics": [{"text": "Photosynthesis", "evidence_segment_ids": refs}]},
                 "notes": [{"heading": "Light", "points": [{"text": "Chlorophyll absorbs light.", "evidence_segment_ids": refs}]}],
                 "questions": [{"prompt": "What absorbs light in green plants?", "options": [
                     {"id": "a", "text": "Chlorophyll"}, {"id": "b", "text": "Iron"},
                     {"id": "c", "text": "Salt"}, {"id": "d", "text": "Glass"}],
                     "correct_option_id": "a", "explanation": "The lecture identifies chlorophyll.", "evidence_segment_ids": refs}]}
        return GeneratedPack.model_validate(value), {"provider": "TEST_DOUBLE", "model": "test-fixture", "prompt_version": "test"}


def wav_bytes(seconds=0.25):
    target = io.BytesIO()
    with wave.open(target, "wb") as audio:
        audio.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        audio.writeframes(b"\0\0" * int(seconds * 16000))
    return target.getvalue()


def operation_key():
    return {"Idempotency-Key": str(uuid4())}


@pytest.fixture
def backend(tmp_path, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("LECTURE_MODEL_DIR", raising=False)
    providers = TestProviders()
    app = create_app(Settings(data_dir=tmp_path / "demo", start_worker=False), providers)
    with TestClient(app) as client:
        client.headers["Authorization"] = "Bearer " + app.state.store.token()
        yield client, app, providers


def upload(client, title="Test fixture", key=None, data=None):
    return client.post("/api/v1/recordings", headers=key or operation_key(),
                       data={"source": "web", "title": title},
                       files={"file": ("fixture.wav", data or wav_bytes(), "audio/wav")})


def processed(backend):
    client, app, providers = backend
    response = upload(client)
    assert response.status_code == 201, response.text
    recording = response.json()
    response = client.post(f"/api/v1/recordings/{recording['id']}/jobs", json={}, headers=operation_key())
    assert response.status_code == 202, response.text
    job = response.json()
    assert app.state.worker.run_once()
    result = client.get(f"/api/v1/jobs/{job['id']}")
    assert result.json()["status"] == "ready", result.text
    pack = client.get(f"/api/v1/recordings/{recording['id']}/study-pack")
    assert pack.status_code == 200, pack.text
    return recording, job, pack.json()
