from __future__ import annotations

import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path

from .core import Problem, Settings


def file_digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def webm_duration(path: Path, settings: Settings) -> float:
    """Measure streamed WebM audio when MediaRecorder omits container duration.

    Decode to a null sink, with a duration ceiling and wall timeout. Progress is
    small text; neither the complete decoded audio nor packet list enters RAM.
    Original uploaded bytes stay unchanged.
    """
    if not shutil.which("ffmpeg"):
        raise Problem("feature_unavailable", "FFmpeg must be installed to verify recorded WebM audio.", 503)
    result = subprocess.run(
        ["ffmpeg", "-v", "error", "-xerror", "-nostdin", "-protocol_whitelist", "file,pipe",
         "-i", str(path), "-map", "0:a:0", "-t", str(settings.max_duration_seconds + 1),
         "-vn", "-ac", "1", "-ar", "16000", "-progress", "pipe:1", "-stats_period", "1",
         "-nostats", "-f", "null", "-"],
        capture_output=True, text=True, timeout=180, check=True,
    )
    times = [int(line.partition("=")[2]) for line in result.stdout.splitlines()
             if line.startswith("out_time_us=") and line.partition("=")[2] != "N/A"]
    return max(times, default=0) / 1_000_000


def probe(path: Path, settings: Settings) -> dict:
    if not shutil.which("ffprobe"):
        raise Problem("feature_unavailable", "FFmpeg/ffprobe must be installed on the server.", 503)
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe", "-show_format",
             "-show_streams", "-of", "json", str(path)],
            capture_output=True, timeout=30, check=True,
        )
        info = json.loads(result.stdout)
        streams = [s for s in info["streams"] if s.get("codec_type") == "audio"]
        if not streams or any(s.get("codec_type") == "video" for s in info["streams"]):
            raise ValueError("Audio-only input required")
        fmt = info["format"]["format_name"]
        declared_duration = info["format"].get("duration", streams[0].get("duration"))
        duration = (webm_duration(path, settings)
                    if declared_duration is None and ("webm" in fmt or "matroska" in fmt)
                    else float(declared_duration or 0))
        if not math.isfinite(duration) or duration <= 0:
            raise ValueError("Invalid duration")
        if "wav" in fmt:
            mime = "audio/wav"
        elif "mp3" in fmt:
            mime = "audio/mpeg"
        elif "mov" in fmt or "mp4" in fmt:
            mime = "audio/mp4"
        elif "webm" in fmt or "matroska" in fmt:
            mime = "audio/webm"
        else:
            raise Problem("unsupported_media", "Use WAV, MP3, M4A/AAC, or WebM/Opus audio.", 415)
        if duration > settings.max_duration_seconds + 0.05:
            raise Problem("duration_limit", "Audio exceeds the server's current verified duration limit.")
        size = path.stat().st_size
        if size <= 0 or size > settings.max_audio_bytes:
            raise Problem("size_limit", "Audio exceeds the current byte limit.", 413)
        return {"duration_seconds": duration, "byte_size": size, "mime_type": mime,
                "sha256": file_digest(path), "codec": streams[0].get("codec_name"),
                "sample_rate": streams[0].get("sample_rate"), "channels": streams[0].get("channels")}
    except Problem:
        raise
    except (ValueError, KeyError, OSError, subprocess.SubprocessError):
        raise Problem("media_corrupt", "The server could not decode this audio file.") from None


def audio_chunk(source: Path, target: Path, start: float, duration: float):
    try:
        subprocess.run(
            ["ffmpeg", "-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe",
             "-ss", str(start), "-i", str(source), "-t", str(duration),
             "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-y", str(target)],
            capture_output=True, timeout=180, check=True,
        )
    except (OSError, subprocess.SubprocessError):
        raise Problem("media_corrupt", "Audio preparation failed; the original remains saved.") from None


def concatenate(sources: list[Path], target: Path):
    # Decode separately; user-controlled names never enter a concat instruction or shell.
    prepared = []
    try:
        for index, path in enumerate(sources):
            temp = target.parent / f"decoded-{index}.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe",
                            "-i", str(path), "-vn", "-ac", "1", "-ar", "16000",
                            "-c:a", "pcm_s16le", "-y", str(temp)],
                           capture_output=True, timeout=180, check=True)
            prepared.append(temp)
        import wave
        with wave.open(str(target), "wb") as output:
            output.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
            for path in prepared:
                with wave.open(str(path), "rb") as stream:
                    while block := stream.readframes(16000 * 10):
                        output.writeframesraw(block)
    except (OSError, ValueError, subprocess.SubprocessError):
        raise Problem("media_corrupt", "The capture files could not be reconstructed.") from None
    finally:
        for path in prepared:
            path.unlink(missing_ok=True)
