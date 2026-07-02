# Filmwave AI Interpretation Server

This is the local server endpoint for the Shorten Track AI interpretation prototype.

The Filmwave web script sends the original source song to:

```txt
http://localhost:8000/interpret
```

The server accepts multipart form data:

- `audio`
- `targetSeconds`
- `prompt`
- `metadata`
- `title`
- `artist`

The server now calls the local Stable Audio 3 CLI through `apps/ai-interpret-server/model_adapter.py` and returns generated WAV audio as `audioBase64` JSON.

## Requirements

Stable Audio 3 must exist at:

```txt
apps/stable-audio-3
```

The model files must already be downloaded/authenticated. For local runs, keep `HF_HUB_DISABLE_XET=1` to avoid slow Xet downloads.

## Run locally

From the repo root:

```bash
cd apps/ai-interpret-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8000
```

Then, in a second terminal:

```bash
cd ~/filmwave-monorepo/apps/web
npm run shorten:interpret-local -- --source "$HOME/Desktop/Rain Dance - Amber Caravan.wav" --length 30
```

Expected result: the Filmwave request reaches the server, Stable Audio generates a WAV, and the web script writes `ai-interpretation-30s.wav`.

## Current limitation

This first wiring uses Stable Audio 3 text generation through the local CLI. The source audio is accepted by the endpoint, but Stable Audio is not yet using the source file as true audio conditioning in this adapter. This is still useful for validating the full Filmwave-to-local-model pipeline before deeper audio-conditioned interpretation work.
