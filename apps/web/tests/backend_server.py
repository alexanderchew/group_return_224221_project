"""TEST ONLY: real HTTP API in an isolated temporary store; no provider/network calls.

Replay uses the immutable saved transcript/generation, not the uploaded silence.
Never import this module from the production launcher or application.
"""
import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/api"))

import httpx  # noqa: E402
import uvicorn  # noqa: E402

from lecture_backend.app import create_app  # noqa: E402
from lecture_backend.core import Settings, now, uid  # noqa: E402
from lecture_backend.schemas import GeneratedPack  # noqa: E402


def blocked(*args, **kwargs):
    raise AssertionError("Frontend integration tests must never call external HTTP/providers.")


async def blocked_async(*args, **kwargs):
    blocked()


class ReplayProviders:
    def __init__(self, saved):
        self.saved = saved

    def configured(self):
        return {"elevenlabs": False, "openai": False}

    def transcribe(self, *args):
        blocked()  # The exact saved transcript is seeded before the explicit job request.

    def generate(self, *args):
        return GeneratedPack.model_validate(self.saved["generated"]), {
            "provider": "SAVED_REAL_PROVIDER_OUTPUT_OFFLINE_REPLAY",
            "model": "saved-gpt-6-luna-response", "prompt_version": "lecture-evidence-v1"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["keyfree", "replay"], required=True)
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    for key in ("ELEVENLABS_API_KEY", "OPENAI_API_KEY", "LECTURE_MODEL_DIR"):
        os.environ.pop(key, None)
    httpx.HTTPTransport.handle_request = blocked
    httpx.AsyncHTTPTransport.handle_async_request = blocked_async
    saved = json.loads((ROOT / "fixtures/regressions/photosynthesis-generated-v1.json").read_text())
    assert saved["fixture_mode"] == "SAVED_REAL_PROVIDER_OUTPUT_OFFLINE_REPLAY"
    with tempfile.TemporaryDirectory(prefix="lecture-frontend-http-") as temporary:
        settings = Settings(data_dir=Path(temporary))
        providers = ReplayProviders(saved) if args.mode == "replay" else None
        app = create_app(settings, providers)
        with app.state.store.tx() as cx:
            cx.execute("UPDATE kv SET value=? WHERE name='demo_token'", ("frontend-http-test-only",))

        if args.mode == "replay":
            @app.middleware("http")
            async def seed_saved_transcript(request, call_next):
                if request.method == "POST" and request.url.path.endswith("/jobs") and request.headers.get("X-CSRF-Token"):
                    recording_id = request.url.path.split("/")[-2]
                    store = app.state.store
                    with store.tx() as cx:
                        rec = store.recording(cx, recording_id)
                        if not rec["current_transcript_revision_id"]:
                            assert rec["duration_seconds"] >= 60
                            revision = {"id": uid("transcript"), "recording_id": recording_id,
                                        "parent_revision_id": None, "origin": "provider", "created_at": now(),
                                        "provider": "SAVED_OUTPUT_OFFLINE_REPLAY", "model": "saved-scribe-v2-response",
                                        "segments": saved["segments"], "_complete": True,
                                        "coverage": {"source_duration_seconds": rec["duration_seconds"],
                                                     "covered_intervals": [[0, rec["duration_seconds"]]], "gaps": []}}
                            store.put(cx, "transcript", revision, recording_id)
                            rec["current_transcript_revision_id"] = revision["id"]
                            store.put(cx, "recording", rec)
                return await call_next(request)
        print(f"TEST ONLY: {args.mode}; isolated store; external HTTP blocked.", flush=True)
        uvicorn.run(app, host="127.0.0.1", port=args.port, access_log=False, log_level="warning")


if __name__ == "__main__":
    main()
