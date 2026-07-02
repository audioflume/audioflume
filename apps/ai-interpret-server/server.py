from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

app = FastAPI(title="Filmwave AI Server")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/interpret")
async def interpret(
    audio: UploadFile = File(...),
    targetSeconds: int = Form(...),
    prompt: str = Form(...),
):
    if targetSeconds not in {15, 30, 60}:
        raise HTTPException(status_code=400, detail="targetSeconds must be 15, 30, or 60")

    suffix = Path(audio.filename or "source.wav").suffix or ".wav"

    with TemporaryDirectory(prefix="filmwave-ai-interpret-") as temp_dir:
        source_path = Path(temp_dir) / f"source{suffix}"
        source_path.write_bytes(await audio.read())

    raise HTTPException(status_code=501, detail="Model adapter is not connected yet.")
