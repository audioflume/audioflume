import os
import tempfile
from pathlib import Path
from typing import Dict, List, Literal, Optional

import librosa
import numpy as np
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ANALYZER_SECRET = os.getenv("ANALYZER_SECRET")

if not SUPABASE_URL:
    raise RuntimeError("Missing SUPABASE_URL")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY")

if not ANALYZER_SECRET:
    raise RuntimeError("Missing ANALYZER_SECRET")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
app = FastAPI(title="Filmwave Audio Analyzer")

EditPointType = Literal[
    "first_hit",
    "drop",
    "break",
    "button_ending",
]

LABELS: Dict[str, str] = {
    "first_hit": "First hit",
    "drop": "Main drop",
    "break": "Break",
    "button_ending": "Button ending",
}


class AnalyzeRequest(BaseModel):
    songId: str
    audioUrl: HttpUrl


def clamp_confidence(value: float) -> float:
    if np.isnan(value) or np.isinf(value):
        return 0.0

    return float(max(0, min(1, value)))


def download_audio(url: str) -> str:
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    suffix = Path(url.split("?")[0]).suffix or ".mp3"
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp.write(response.content)
    temp.close()

    return temp.name


def add_point(
    points: List[dict],
    point_type: EditPointType,
    time: float,
    confidence: float,
):
    if time < 0:
        return

    points.append(
        {
            "type": point_type,
            "time": round(float(time), 2),
            "label": LABELS[point_type],
            "confidence": round(clamp_confidence(confidence), 2),
        }
    )


def dedupe_points(points: List[dict], min_gap_seconds: float = 2.0):
    sorted_points = sorted(points, key=lambda item: item["time"])
    deduped: List[dict] = []

    for point in sorted_points:
        too_close_same_type = any(
            point["type"] == existing["type"]
            and abs(point["time"] - existing["time"]) < min_gap_seconds
            for existing in deduped
        )

        if not too_close_same_type:
            deduped.append(point)

    return deduped


def detect_edit_points(audio_path: str):
    y, sr = librosa.load(audio_path, sr=22050, mono=True)

    duration = librosa.get_duration(y=y, sr=sr)
    hop_length = 512

    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    onset_env = librosa.onset.onset_strength(
        y=y,
        sr=sr,
        hop_length=hop_length,
    )

    tempo, _beats = librosa.beat.beat_track(
        y=y,
        sr=sr,
        hop_length=hop_length,
    )

    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env,
        sr=sr,
        hop_length=hop_length,
        backtrack=True,
    )

    onset_times = librosa.frames_to_time(
        onset_frames,
        sr=sr,
        hop_length=hop_length,
    )

    rms_times = librosa.frames_to_time(
        np.arange(len(rms)),
        sr=sr,
        hop_length=hop_length,
    )

    points: List[dict] = []

    max_onset = float(np.max(onset_env) + 1e-6)
    strong_onset_threshold = np.percentile(onset_env, 85)

    # First hit: first strong editable cue.
    for frame in onset_frames:
        time = librosa.frames_to_time(frame, sr=sr, hop_length=hop_length)
        strength = onset_env[frame] if frame < len(onset_env) else 0

        if time > 1.5 and strength >= strong_onset_threshold:
            add_point(points, "first_hit", time, strength / max_onset)
            break

    frames_per_second = sr / hop_length
    window = max(4, int(frames_per_second * 4))

    smooth_rms = np.convolve(
        rms,
        np.ones(window) / window,
        mode="same",
    )

    energy_delta = np.diff(smooth_rms, prepend=smooth_rms[0])
    max_positive_delta = float(np.max(energy_delta) + 1e-6)
    max_negative_delta = float(abs(np.min(energy_delta)) + 1e-6)
    negative_threshold = np.percentile(energy_delta, 5)

    # Main drop: strongest energy jump in the middle of the track.
    valid_drop_indices = np.where(
        (rms_times > duration * 0.2) & (rms_times < duration * 0.75)
    )[0]

    if len(valid_drop_indices):
        drop_index = valid_drop_indices[np.argmax(energy_delta[valid_drop_indices])]
        add_point(
            points,
            "drop",
            rms_times[drop_index],
            energy_delta[drop_index] / max_positive_delta,
        )

    # Break: strongest energy reduction after the first quarter.
    valid_break_indices = np.where(
        (rms_times > duration * 0.25) & (rms_times < duration * 0.85)
    )[0]

    if len(valid_break_indices):
        break_index = valid_break_indices[np.argmin(energy_delta[valid_break_indices])]

        if energy_delta[break_index] <= negative_threshold:
            add_point(
                points,
                "break",
                rms_times[break_index],
                abs(energy_delta[break_index]) / max_negative_delta,
            )

    # Button ending: final strong onset shortly before the end.
    final_onsets = [
        float(time) for time in onset_times if duration - 20 <= time <= duration - 1.5
    ]

    if final_onsets:
        add_point(points, "button_ending", final_onsets[-1], 0.65)

    tempo_value = float(np.asarray(tempo).item())

    return {
        "duration": round(float(duration), 2),
        "tempo": round(tempo_value, 2),
        "editPoints": dedupe_points(points),
    }


def save_edit_points(song_id: str, edit_points: List[dict]):
    supabase.table("song_edit_points").delete().eq("song_id", song_id).eq(
        "source", "auto"
    ).execute()

    rows = [
        {
            "song_id": song_id,
            "type": point["type"],
            "time_seconds": point["time"],
            "label": point["label"],
            "confidence": point["confidence"],
            "source": "auto",
        }
        for point in edit_points
    ]

    if rows:
        supabase.table("song_edit_points").insert(rows).execute()

    return rows


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
def analyze(
    request: AnalyzeRequest,
    x_analyzer_secret: Optional[str] = Header(default=None),
):
    if x_analyzer_secret != ANALYZER_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    audio_path = ""

    try:
        audio_path = download_audio(str(request.audioUrl))
        result = detect_edit_points(audio_path)
        saved_rows = save_edit_points(request.songId, result["editPoints"])

        return {
            "songId": request.songId,
            "saved": len(saved_rows),
            **result,
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
