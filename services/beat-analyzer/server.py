import json
import os
import tempfile
import traceback
import zlib
from statistics import median
from typing import List

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from beat_this.inference import File2Beats

app = FastAPI()

file2beats = File2Beats(
    checkpoint_path="final0",
    device="cpu",
    dbn=False,
)

def estimate_bpm(beats: List[float]):
    if len(beats) < 4:
        return None

    intervals = [
        beats[index] - beats[index - 1]
        for index in range(1, len(beats))
        if 0.25 <= beats[index] - beats[index - 1] <= 2.0
    ]

    if not intervals:
        return None

    bpm = 60 / median(intervals)

    while bpm < 55:
        bpm *= 2

    while bpm > 180:
        bpm /= 2

    return round(bpm)


def _coerce_tempo(value):
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        tempo = float(value)
        return tempo if 20 <= tempo <= 400 else None

    if isinstance(value, str):
        try:
            tempo = float(value.strip())
        except ValueError:
            return None
        return tempo if 20 <= tempo <= 400 else None

    if isinstance(value, list):
        for item in value:
            tempo = _coerce_tempo(item)
            if tempo is not None:
                return tempo

    if isinstance(value, dict):
        for item in value.values():
            tempo = _coerce_tempo(item)
            if tempo is not None:
                return tempo

    return None


def _find_tempo_in_logic_metadata(value):
    if isinstance(value, dict):
        for key, item in value.items():
            normalized_key = str(key).strip().lower().replace("_", "").replace("-", "")

            if normalized_key in {"tempo", "bpm", "projecttempo"}:
                tempo = _coerce_tempo(item)
                if tempo is not None:
                    return tempo

        for item in value.values():
            tempo = _find_tempo_in_logic_metadata(item)
            if tempo is not None:
                return tempo

    elif isinstance(value, list):
        for item in value:
            tempo = _find_tempo_in_logic_metadata(item)
            if tempo is not None:
                return tempo

    return None


def extract_logic_tempo(path: str):
    try:
        with open(path, "rb") as audio_file:
            data = audio_file.read()

        if len(data) < 12 or data[:4] not in {b"RIFF", b"RF64", b"BW64"} or data[8:12] != b"WAVE":
            return None

        offset = 12

        while offset + 8 <= len(data):
            chunk_id = data[offset:offset + 4]
            chunk_size = int.from_bytes(data[offset + 4:offset + 8], "little")
            chunk_start = offset + 8
            chunk_end = chunk_start + chunk_size

            if chunk_end > len(data):
                break

            if chunk_id == b"ResU":
                try:
                    metadata = json.loads(zlib.decompress(data[chunk_start:chunk_end]))
                    return _find_tempo_in_logic_metadata(metadata)
                except (json.JSONDecodeError, UnicodeDecodeError, zlib.error):
                    return None

            offset = chunk_end + (chunk_size % 2)
    except OSError:
        return None

    return None

@app.get("/health")
def health():
    return {"ok": True, "source": "beat_this"}

@app.post("/analyze-beats")
async def analyze_beats(file: UploadFile = File(...)):
    temp_path = None

    try:
        suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        embedded_tempo = extract_logic_tempo(temp_path)

        if embedded_tempo is not None:
            return JSONResponse({
                "bpm": round(embedded_tempo),
                "confidence": None,
                "beats": [],
                "downbeats": [],
                "source": "logic_metadata"
            })

        result = file2beats(temp_path)

        if isinstance(result, tuple):
            beats, downbeats = result
        elif isinstance(result, dict):
            beats = result.get("beats", [])
            downbeats = result.get("downbeats", [])
        else:
            return JSONResponse({
                "error": "Unexpected Beat-This result type",
                "result_type": str(type(result)),
                "result": str(result)[:1000],
            }, status_code=500)

        beats = [round(float(item), 4) for item in beats]
        downbeats = [round(float(item), 4) for item in downbeats]

        return JSONResponse({
            "bpm": estimate_bpm(beats),
            "confidence": None,
            "beats": beats,
            "downbeats": downbeats,
            "source": "beat_this"
        })

    except Exception as error:
        return JSONResponse({
            "error": str(error),
            "traceback": traceback.format_exc()
        }, status_code=500)

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
