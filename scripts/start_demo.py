#!/usr/bin/env python3
"""Start Alex's local API. Provider credentials are entered privately, never persisted."""
from __future__ import annotations

import argparse
import getpass
import fcntl
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1", help="Use your laptop LAN IP explicitly for phone access.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-prompt", action="store_true", help="Start without requesting provider keys; missing providers stay disabled.")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "var/demo")
    parser.add_argument("--quiet-access", action="store_true", help="Do not print the separate demo connection code.")
    args = parser.parse_args()
    os.umask(0o077)
    args.data_dir = args.data_dir.resolve()
    args.data_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    launcher_lease = (args.data_dir / "launcher.lock").open("a")
    try:
        fcntl.flock(launcher_lease, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("This demo data directory already has a running launcher. Stop it with Ctrl+C before restarting.")
        return 2
    if not args.no_prompt:
        print("Provider keys stay in this server process; press Enter to leave a provider disabled.")
        try:
            for variable, label in [("ELEVENLABS_API_KEY", "ElevenLabs API key"), ("OPENAI_API_KEY", "OpenAI API key")]:
                if not os.environ.get(variable):
                    value = getpass.getpass(f"{label} (hidden, optional): ").strip()
                    if value:
                        os.environ[variable] = value
        except (EOFError, KeyboardInterrupt):
            print("\nStartup canceled; no keys were saved.")
            return 130
    from lecture_backend.app import create_app
    from lecture_backend.core import Settings
    import uvicorn

    settings = Settings(data_dir=args.data_dir)
    app = create_app(settings)
    store = app.state.store
    print(f"Local API: http://{args.host}:{args.port}/docs")
    print(f"Browser access setup: http://{args.host}:{args.port}/operator/connect")
    print(f"Data stays in: {settings.data_dir}")
    print("Shared demo budget: US$20 total. Previously requested jobs can resume on startup.")
    print("Provider status:", {k: bool(os.getenv(k)) for k in ("ELEVENLABS_API_KEY", "OPENAI_API_KEY")})
    if not args.quiet_access:
        print("Demo connection code (NOT a provider key):", store.token())
    # This local file is app-access provisioning, not provider credentials; it is private and gitignored.
    access = settings.data_dir / "operator-access"
    access.write_text(store.token() + "\n")
    access.chmod(0o600)
    runtime = settings.data_dir / "server.pid"
    runtime.write_text(str(os.getpid()) + "\n")
    try:
        uvicorn.run(app, host=args.host, port=args.port, access_log=False, log_level="warning")
    finally:
        if runtime.exists() and runtime.read_text().strip() == str(os.getpid()):
            runtime.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
