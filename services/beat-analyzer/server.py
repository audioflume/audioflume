import os
import tempfile
import traceback
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
