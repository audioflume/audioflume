from fastapi import FastAPI

app = FastAPI(title="Filmwave AI Server")


@app.get("/health")
def health():
    return {"status": "ok"}
