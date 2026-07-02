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

Current status: the server scaffold is in place, but the model adapter is intentionally not connected yet. The endpoint will return `501` until a local music model is plugged into `model_adapter.py`.

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

Expected current result: the Filmwave request reaches the server, and the server returns a clear `Model adapter is not connected yet` message.

## Next step

Connect a real local music model inside:

```txt
apps/ai-interpret-server/model_adapter.py
```

The adapter should return a generated WAV file path for the new short interpretation.
