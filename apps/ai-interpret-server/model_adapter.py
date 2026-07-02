from __future__ import annotations

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
    """Adapter seam for the local music model."""

    raise ModelNotConfiguredError(
        "No local music model is connected yet. Add the model call inside generate_interpretation()."
    )
