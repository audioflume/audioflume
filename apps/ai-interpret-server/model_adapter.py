from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


class ModelNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class InterpretationRequest:
    source_path: Path
    target_seconds: int
    prompt: str
    metadata: Optional[str] = None
    title: Optional[str] = None
    artist: Optional[str] = None


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

    smart_reference_path = create_smart_reference(request=request, repo_root=repo_root)
    output_path = request.source_path.parent / f"ai-interpretation-{request.target_seconds}s.wav"
    prompt = build_stable_audio_prompt(request)
    init_noise_level = os.environ.get("FILMWAVE_STABLE_AUDIO_INIT_NOISE_LEVEL", "0.18")
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
        str(smart_reference_path),
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


def create_smart_reference(*, request: InterpretationRequest, repo_root: Path) -> Path:
    node_path = shutil.which("node")

    if node_path is None:
        raise ModelNotConfiguredError("node is not installed or is not available on PATH.")

    script_path = repo_root / "apps" / "web" / "scripts" / "shorten-repair-candidate-local.mjs"
    web_dir = repo_root / "apps" / "web"

    if not script_path.exists():
        raise ModelNotConfiguredError(f"Smart edit script not found: {script_path}")

    output_dir = request.source_path.parent
    smart_reference_path = output_dir / f"smart-edit-{request.target_seconds}s.wav"

    command = [
        node_path,
        str(script_path),
        "--source",
        str(request.source_path),
        "--length",
        str(request.target_seconds),
        "--output",
        str(output_dir),
    ]

    completed = subprocess.run(
        command,
        cwd=web_dir,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )

    if completed.returncode != 0:
        raise RuntimeError(completed.stdout or "Smart edit reference generation failed.")

    if not smart_reference_path.exists():
        raise RuntimeError("Smart edit reference finished, but no output file was created.")

    return smart_reference_path


def build_stable_audio_prompt(request: InterpretationRequest) -> str:
    identity = " ".join(part for part in [request.title, request.artist] if part)
    reference_note = f"Use the smart edit reference as the primary structure for {identity}." if identity else "Use the smart edit reference as the primary structure."

    return " ".join(
        [
            reference_note,
            "Preserve the smart edit structure, timing, tempo feel, groove, instrumentation, texture, and emotional character.",
            "Make it feel like a smoother short version of the same cue rather than a new composition.",
            "Keep changes conservative, musical, and coherent.",
            "Do not replace the melody, chords, or core identity unless absolutely necessary.",
            request.prompt,
        ]
    )
