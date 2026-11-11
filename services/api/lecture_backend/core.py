from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
import threading
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[3]


def now() -> str:
    return datetime.now(UTC).isoformat()


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()


class Problem(Exception):
    def __init__(self, code: str, message: str, status: int = 422,
                 retryable: bool = False, stage: str | None = None):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status
        self.retryable, self.stage = retryable, stage

    def payload(self) -> dict:
        return {"code": self.code, "message": self.message,
                "retryable": self.retryable, "stage": self.stage}


@dataclass
class Settings:
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("LECTURE_DATA_DIR", ROOT / "var/demo")))
    max_audio_bytes: int = 128 * 1024 * 1024
    max_duration_seconds: float = 3600.0
    target_max_duration_seconds: float = 36000.0
    target_max_audio_bytes: int = 2_000_000_000
    storage_limit_bytes: int = 4_000_000_000
    part_bytes: int = 8 * 1024 * 1024
    chunk_seconds: float = 600.0
    output_tokens: int = 8192
    generation_chars: int = 24000
    openai_model: str = "gpt-6-luna"
    scribe_model: str = "scribe_v2"
    allowed_origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")
    model_dir: Path | None = None
    start_worker: bool = True
    # Above the public standard prices checked 2026-11-04. Accounting is explicitly estimated.
    stt_usd_per_hour_bound: str = "0.50"
    llm_input_usd_per_million_bound: str = "1.00"
    llm_output_usd_per_million_bound: str = "5.00"

    def __post_init__(self):
        self.data_dir = self.data_dir.resolve()
        self.data_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(self.data_dir, 0o700)
        for name in ("audio", "working", "uploads"):
            (self.data_dir / name).mkdir(exist_ok=True, mode=0o700)
        if self.model_dir is None and os.getenv("LECTURE_MODEL_DIR"):
            self.model_dir = Path(os.environ["LECTURE_MODEL_DIR"]).resolve()


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.path = settings.data_dir / "demo.sqlite3"
        self.operation_lock = threading.RLock()
        with self.tx() as cx:
            cx.executescript("""
            CREATE TABLE IF NOT EXISTS objects(
                id TEXT PRIMARY KEY, kind TEXT NOT NULL, recording_id TEXT,
                body TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS object_lookup ON objects(kind, recording_id, created_at);
            CREATE TABLE IF NOT EXISTS idempotency(
                route TEXT NOT NULL, key TEXT NOT NULL, body_hash TEXT NOT NULL,
                response TEXT NOT NULL, status INTEGER NOT NULL, recording_id TEXT,
                PRIMARY KEY(route,key));
            CREATE TABLE IF NOT EXISTS reservations(
                id TEXT PRIMARY KEY, provider TEXT NOT NULL, job_id TEXT,
                amount INTEGER NOT NULL CHECK(amount>=0), status TEXT NOT NULL,
                detail TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS kv(name TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)
            cx.execute("INSERT OR IGNORE INTO kv VALUES('budget_ceiling_micro','20000000')")
            cx.execute("INSERT OR IGNORE INTO kv VALUES('budget_contingency_micro','2000000')")
            cx.execute("INSERT OR IGNORE INTO kv VALUES('demo_token',?)", (secrets.token_urlsafe(32),))
        os.chmod(self.path, 0o600)

    @contextmanager
    def tx(self):
        cx = sqlite3.connect(self.path, timeout=30, isolation_level=None)
        cx.row_factory = sqlite3.Row
        cx.execute("PRAGMA journal_mode=WAL")
        cx.execute("PRAGMA foreign_keys=ON")
        cx.execute("BEGIN IMMEDIATE")
        try:
            yield cx
            cx.commit()
        except BaseException:
            cx.rollback()
            raise
        finally:
            cx.close()

    @staticmethod
    def get(cx, object_id: str, kind: str | None = None) -> dict | None:
        row = cx.execute("SELECT kind,body FROM objects WHERE id=?", (object_id,)).fetchone()
        return json.loads(row["body"]) if row and (kind is None or row["kind"] == kind) else None

    @staticmethod
    def put(cx, kind: str, body: dict, recording_id: str | None = None):
        cx.execute("INSERT INTO objects VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,recording_id=COALESCE(excluded.recording_id,objects.recording_id)",
                   (body["id"], kind, recording_id, canonical(body), body.get("created_at", now())))

    @staticmethod
    def list(cx, kind: str, recording_id: str | None = None) -> list[dict]:
        if recording_id is None:
            rows = cx.execute("SELECT body FROM objects WHERE kind=? ORDER BY created_at DESC,id DESC", (kind,))
        else:
            rows = cx.execute("SELECT body FROM objects WHERE kind=? AND recording_id=? ORDER BY created_at DESC,id DESC", (kind, recording_id))
        return [json.loads(r["body"]) for r in rows]

    @staticmethod
    def recording(cx, recording_id: str) -> dict:
        body = Store.get(cx, recording_id, "recording")
        if not body or body.get("deleted_at"):
            raise Problem("not_found", "Recording not found.", 404)
        return body

    def token(self) -> str:
        with self.tx() as cx:
            return cx.execute("SELECT value FROM kv WHERE name='demo_token'").fetchone()[0]

    @staticmethod
    def replay(cx, route: str, key: str, body_hash: str) -> tuple[dict, int] | None:
        row = cx.execute("SELECT * FROM idempotency WHERE route=? AND key=?", (route, key)).fetchone()
        if row:
            if row["body_hash"] != body_hash:
                raise Problem("idempotency_conflict", "This operation key was used with different content.", 409)
            return json.loads(row["response"]), row["status"]
        return None

    @staticmethod
    def remember(cx, route, key, body_hash, response, status, recording_id=None):
        cx.execute("INSERT INTO idempotency VALUES(?,?,?,?,?,?)",
                   (route, key, body_hash, canonical(response), status, recording_id))

    def budget(self, cx=None) -> dict:
        if cx is None:
            with self.tx() as connection:
                return self.budget(connection)
        rows = cx.execute("SELECT status,COALESCE(SUM(amount),0) total FROM reservations GROUP BY status").fetchall()
        totals = {r["status"]: r["total"] for r in rows}
        ceiling = int(cx.execute("SELECT value FROM kv WHERE name='budget_ceiling_micro'").fetchone()[0])
        contingency = int(cx.execute("SELECT value FROM kv WHERE name='budget_contingency_micro'").fetchone()[0])
        settled, reserved, uncertain = (totals.get(k, 0) for k in ("settled", "reserved", "uncertain"))
        from decimal import Decimal
        def amount(n):
            return format(Decimal(n) / Decimal(1_000_000), ".6f")
        return {"currency": "USD", "ceiling_usd": amount(ceiling), "settled_usd": amount(settled),
                "reserved_usd": amount(reserved), "uncertain_usd": amount(uncertain),
                "contingency_usd": amount(contingency),
                "available_usd": amount(max(0, ceiling - contingency - settled - reserved - uncertain)),
                "warning": settled + reserved + uncertain >= 16_000_000,
                "accounting_basis": "conservative_estimates_not_vendor_invoice"}

    def reserve(self, provider: str, job_id: str, amount: int, detail: dict) -> str:
        if amount <= 0:
            raise Problem("price_configuration_required", "A positive request cost bound is required.", 409)
        with self.tx() as cx:
            budget = self.budget(cx)
            from decimal import Decimal
            available = int(Decimal(budget["available_usd"]) * 1_000_000)
            if amount > available:
                raise Problem("budget_exceeded", "The demo allowance cannot cover this request. Your recording is saved.", 409)
            reservation_id = uid("cost")
            cx.execute("INSERT INTO reservations VALUES(?,?,?,?,?,?,?)",
                       (reservation_id, provider, job_id, amount, "reserved", canonical(detail), now()))
            job = self.get(cx, job_id, "job")
            if job:
                if job["status"] == "canceled":
                    raise Problem("deleted", "This work was canceled or removed.", 404)
                # A settled charge can precede the worker's saved result.
                job["_provider_result_pending"] = True
                self.put(cx, "job", job, job["recording_id"])
            return reservation_id

    def settle(self, reservation_id: str, status: str = "settled", usage: dict | None = None):
        if status not in {"settled", "uncertain", "released"}:
            raise ValueError("Invalid reservation state")
        with self.tx() as cx:
            row = cx.execute("SELECT detail FROM reservations WHERE id=?", (reservation_id,)).fetchone()
            if row:
                detail = json.loads(row["detail"])
                if usage:
                    detail["usage"] = usage
                cx.execute("UPDATE reservations SET status=?,detail=? WHERE id=?",
                           (status, canonical(detail), reservation_id))


def public_recording(body: dict) -> dict:
    return {k: v for k, v in body.items() if not k.startswith("_")}
