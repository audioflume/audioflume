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
    init_noise_level = os.environ.get("FILMWAVE_STABLE_AUDIO_INIT_NOISE_LEVEL", "0.25")
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
        "--init-audio",
        str(request.source_path),
        "--init-noise-level",
        init_noise_level,
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
    reference_note = f"Use the source audio as the primary reference for {identity}." if identity else "Use the source audio as the primary reference."

    return " ".join(
        [
            reference_note,
            "Preserve the broad tempo feel, groove, instrumentation, texture, arrangement language, and emotional character of the source cue.",
            "Create a shorter version that feels related to the same song rather than a new unrelated composition.",
            "Keep changes conservative, musical, and coherent.",
            "Avoid vocals unless they are clearly present in the source.",
            request.prompt,
        ]
    )
