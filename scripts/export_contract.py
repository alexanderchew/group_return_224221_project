#!/usr/bin/env python3
"""Export OpenAPI from implementation without a server, worker, credentials or paid calls."""
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))
from lecture_backend.app import create_app  # noqa: E402
from lecture_backend.core import Settings  # noqa: E402

with tempfile.TemporaryDirectory(prefix="lecture-contract-") as temporary:
    app = create_app(Settings(data_dir=Path(temporary), start_worker=False))
    target = ROOT / "fixtures/contracts/openapi.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n")
    print(target)
