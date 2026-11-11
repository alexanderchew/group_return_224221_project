"""Exercise the real API in private temporary storage with labeled provider doubles.

Only used by frontend contract tests. No socket or paid provider is contacted.
"""
import json
import sys
import tempfile
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
sys.path[:0] = [str(ROOT / "services/api"), str(ROOT / "tests")]
from conftest import TestProviders, operation_key, upload  # noqa: E402
from lecture_backend.app import create_app  # noqa: E402
from lecture_backend.core import Settings  # noqa: E402

CSRF = "frontend-contract-csrf"


def no_network(*args, **kwargs):
    raise AssertionError("Frontend contract tests cannot make external HTTP requests.")


httpx.HTTPTransport.handle_request = no_network
httpx.AsyncHTTPTransport.handle_async_request = no_network
request = json.loads(sys.stdin.read() or "{}")
with tempfile.TemporaryDirectory(prefix="lecture-frontend-contract-") as directory:
    app = create_app(Settings(data_dir=Path(directory), start_worker=False), TestProviders())
    with TestClient(app) as client:
        token = app.state.store.token()
        client.headers["Authorization"] = "Bearer " + token
        config = client.get("/api/v1/config").json()
        budget = client.get("/api/v1/budget").json()
        recording = upload(client).json()
        path = f"/api/v1/recordings/{recording['id']}"
        accepted = client.post(path + "/jobs", json={}, headers=operation_key())
        assert accepted.status_code == 202, accepted.text
        app.state.worker.run_once()
        job = client.get("/api/v1/jobs/" + accepted.json()["id"]).json()
        assert job["status"] == "ready", job
        pack = client.get(path + "/study-pack").json()
        answers = [{"question_id": q["id"], "option_id": next(o["id"] for o in q["options"] if o["text"] == "Chlorophyll")}
                   for q in pack["questions"]]
        scored = client.post(path + "/quiz-attempts", headers=operation_key(),
                             json={"study_pack_id": pack["id"], "answers": answers})
        assert scored.status_code == 201, scored.text
        del client.headers["Authorization"]
        connect = client.post("/operator/connect", data={"access_token": token}, follow_redirects=False)
        assert connect.status_code == 303 and client.cookies.get("lecture_csrf")
        # A public test-only CSRF value lets the TS adapter exercise actual cookie
        # validation across processes. Demo access stays private to this process.
        client.cookies.clear()
        client.cookies.set("lecture_demo", token)
        client.cookies.set("lecture_csrf", CSRF)
        mutation = client.post(path + "/jobs", json={}, headers=request.get("headers", {}))
        assert app.state.store.budget()["settled_usd"] == "0.000000"
        print(json.dumps({"fixture_mode": "DEVELOPMENT_ONLY_PROVIDER_DOUBLES", "config": config, "budget": budget,
                          "recording": recording, "job": job, "pack": pack, "attempt": scored.json(),
                          "mutation": {"status": mutation.status_code, "body": mutation.json()}}))
