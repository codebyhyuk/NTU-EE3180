# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List
from pathlib import Path
from dotenv import load_dotenv
import os, io, zipfile, asyncio, httpx

# ---- Load backend/.env explicitly ----
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# support both names (your leader’s example vs our earlier code)
API_KEY = os.getenv("REMOVE_BG_API_KEY") or os.getenv("REMOVEBG_API_KEY")
if not API_KEY:
    raise RuntimeError(f"REMOVE_BG_API_KEY (or REMOVEBG_API_KEY) missing in {ENV_PATH}")

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))

REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg"

# ---- FastAPI app ----
app = FastAPI(title="DIP Background Removal API")

# Allow Vite dev & preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "remove.bg bridge"}

@app.get("/health")
def health():
    return {"status": "up"}

@app.get("/version")
def version():
    return {"version": "0.1.0", "features": ["single", "batch-zip"]}

# ---------- Single image ----------
@app.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...), size: str = "auto"):
    img_bytes = await file.read()
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.post(
                REMOVE_BG_URL,
                files={"image_file": (file.filename or "upload.png", img_bytes)},
                data={"size": size},
                headers={"X-Api-Key": API_KEY},
            )
        except Exception as e:
            raise HTTPException(500, f"Request failed: {e}")

    if r.status_code != 200:
        raise HTTPException(r.status_code, r.text)

    headers = {
        "Content-Disposition": 'inline; filename="output.png"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(iter([r.content]), media_type="image/png", headers=headers)

# ---------- Batch (async + concurrent) ----------
def _png_name(name: str) -> str:
    return f"{Path(name).stem or 'image'}.png"

@app.post("/batch-remove-bg")
async def batch_remove_bg(
    files: List[UploadFile] = File(...),
    size: str = "auto",
    concurrent: int = 3,   # tune if you hit 429 rate limits
    as_zip: bool = True    # true => return a ZIP of PNGs
):
    if not files:
        raise HTTPException(400, "No files uploaded")

    # Read all uploads concurrently
    contents = await asyncio.gather(*[f.read() for f in files])
    names = [f.filename or f"image_{i}.png" for i, f in enumerate(files)]

    sem = asyncio.Semaphore(max(1, min(concurrent, 8)))  # safety cap

    async def process_one(name: str, data: bytes, client: httpx.AsyncClient):
        async with sem:
            try:
                r = await client.post(
                    REMOVE_BG_URL,
                    files={"image_file": (name, data)},
                    data={"size": size},
                    headers={"X-Api-Key": API_KEY},
                    timeout=60,
                )
                if r.status_code == 200:
                    return {"filename": name, "ok": True, "content": r.content}
                return {"filename": name, "ok": False, "status": r.status_code, "error": r.text}
            except Exception as e:
                return {"filename": name, "ok": False, "status": 500, "error": str(e)}

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[process_one(n, d, client) for n, d in zip(names, contents)]
        )

    if as_zip:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
            for res in results:
                if res.get("ok"):
                    z.writestr(_png_name(res["filename"]), res["content"])
                else:
                    msg = f"Failed: {res.get('status')} {res.get('error','')}".strip()
                    z.writestr(f"{_png_name(res['filename'])}.error.txt", msg or "Unknown error")
        buf.seek(0)
        headers = {"Content-Disposition": 'attachment; filename="cutouts.zip"'}
        return StreamingResponse(buf, media_type="application/zip", headers=headers)

    # JSON summary (no images)
    return {
        "processed": len(results),
        "success": sum(1 for r in results if r.get("ok")),
        "failed": sum(1 for r in results if not r.get("ok")),
        "results": [{k: v for k, v in r.items() if k != "content"} for r in results],
    }
