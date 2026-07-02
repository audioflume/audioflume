from base64 import b64encode
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from model_adapter import InterpretationRequest, ModelNotConfiguredError, generate_interpretation

app = FastAPI(title="Filmwave AI Server")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/interpret")
async def interpret(
    audio: UploadFile = File(...),
    targetSeconds: int = Form(...),
    prompt: str = Form(...),
    metadata: str | None = Form(default=None),
    title: str | None = Form(default=None),
    artist: str | None = Form(default=None),
):
    if targetSeconds not in {15, 30, 60}:
        raise HTTPException(status_code=400, detail="targetSeconds must be 15, 30, or 60")

    suffix = Path(audio.filename or "source.wav").suffix or ".wav"

    with TemporaryDirectory(prefix="filmwave-ai-interpret-") as temp_dir:
        source_path = Path(temp_dir) / f"source{suffix}"
        source_path.write_bytes(await audio.read())

        request = InterpretationRequest(
            source_path=source_path,
            target_seconds=targetSeconds,
            prompt=prompt,
            metadata=metadata,
            title=title,
            artist=artist,
        )

        try:
            result = generate_interpretation(request)
        except ModelNotConfiguredError as error:
            raise HTTPException(status_code=501, detail=str(error)) from error
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

        audio_base64 = b64encode(Path(result.output_path).read_bytes()).decode("utf-8")

    return JSONResponse({"audioBase64": audio_base64})
