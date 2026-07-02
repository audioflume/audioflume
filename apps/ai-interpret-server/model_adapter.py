from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


class ModelNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class InterpretationRequest:
    source_path: Path
    target_seconds: int
    prompt: str
    metadata: str | None = None
    title: str | None = None
    artist: str | None = None


@dataclass(frozen=True)
class InterpretationResult:
    output_path: Path
    media_type: str = "audio/wav"


def generate_interpretation(request: InterpretationRequest) -> InterpretationResult:
    repo_root = Path(__file__).resolve().parents[2]
    stable_audio_dir = repo_root / "apps" / "stable-audio-3"

    if not stable_audio_dir.exists():
        raise ModelNotConfiguredError(
            "Stable Audio 3 is not installed. Expected it at apps/stable-audio-3."
        )

    uv_path = shutil.which("uv") or str(Path.home() / ".local" / "bin" / "uv")

    if not Path(uv_path).exists() and shutil.which("uv") is None:
        raise ModelNotConfiguredError("uv is not installed or is not available on PATH.")

    output_path = request.source_path.parent / f"ai-interpretation-{request.target_seconds}s.wav"
    prompt = build_stable_audio_prompt(request)
    env = os.environ.copy()
    env["HF_HUB_DISABLE_XET"] = "1"

    command = [
        uv_path,
        "run",
        "stable-audio",
        "--model",
        "small-music",
        "-p",
        prompt,
        "--duration",
        str(request.target_seconds),
        "-o",
        str(output_path),
    ]

    completed = subprocess.run(
        command,
        cwd=stable_audio_dir,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )

    if completed.returncode != 0:
        raise RuntimeError(completed.stdout or "Stable Audio generation failed.")

    if not output_path.exists():
        raise RuntimeError("Stable Audio finished, but no output file was created.")

    return InterpretationResult(output_path=output_path)


def build_stable_audio_prompt(request: InterpretationRequest) -> str:
    identity = " ".join(part for part in [request.title, request.artist] if part)
    reference_note = f"Inspired by the reference cue {identity}." if identity else "Inspired by the provided reference cue."

    return " ".join(
        [
            reference_note,
            "Create an intentional short music cue with the same broad mood, tempo feel, instrumentation, groove, production style, and emotional character.",
            "It should have a clear beginning, natural development, and resolved ending.",
            "Do not make it feel like a loop, hard edit, crossfade, remix, or generic stock track.",
            request.prompt,
        ]
    )
