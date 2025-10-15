# backend/app/main.py
import os
import json                      # NEW
import zipfile                   # NEW
from io import BytesIO
from typing import Optional, Dict, Any, List

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask   # NEW
from PIL import Image

from . import utils

# Load backend/.env (this file lives at backend/app/main.py)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Parse comma-separated origins → list
raw_origins = os.getenv("CORS_ORIGINS", "")
ALLOW_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()] or ["*"]

app = FastAPI(title="E009 Custom Cropper", version="2.2.0")  # bumped

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Presets ----
PRESETS = {
    "story":  {"ratio": 9 / 16, "size": (1080, 1920)},
    "post":   {"ratio": 1.0,    "size": (1080, 1080)},
    "shopee": {"ratio": 4 / 5,  "size": (1080, 1350)},
    "amazon": {"ratio": 1.0,    "size": (2000, 2000)},
}

# ---- Helpers ----
def pil_to_png_response(img: Image.Image, filename: str = "cropped.png") -> StreamingResponse:
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

def _process_one_png(img_bytes: bytes, filename: str, preset: str, box: Optional[Dict[str, Any]]) -> tuple[str, bytes]:
    """
    Reuse your existing pipeline for a single image.
    Returns: (output_filename, png_bytes)
    """
    meta = PRESETS[preset]
    target_ratio = meta["ratio"]
    target_size  = meta["size"]

    img = Image.open(BytesIO(img_bytes))
    img.load()

    if box and all(k in box for k in ("x", "y", "width", "height")):
        cropped = utils.crop_at_position_with_ratio(
            img, target_ratio,
            int(box["x"]), int(box["y"]),
            int(box["width"]), int(box["height"])
        )
    else:
        cropped = utils.center_crop_to_ratio(img, target_ratio)

    resized = utils.resize_image(cropped, target_size)
    out_buf = BytesIO()
    resized.save(out_buf, format="PNG")
    return (f"{preset}_crop_{filename or 'image'}.png", out_buf.getvalue())

# ---- Routes ----
@app.get("/", include_in_schema=False)
def health():
    return {"ok": True, "service": "E009 Custom Cropper"}

@app.post("/crop/custom", summary="Preset crop (story/post/shopee/amazon). Optional user box to choose position.")
async def crop_custom(
    file: UploadFile = File(..., description="Processed PNG"),
    preset: str = Query(..., description="story | post | shopee | amazon"),
    # Optional user-dragged box (in image-native pixels). Send these as multipart form fields.
    x: Optional[int] = Form(None, description="Top-left X of user box"),
    y: Optional[int] = Form(None, description="Top-left Y of user box"),
    width: Optional[int] = Form(None, description="Width of user box"),
    height: Optional[int] = Form(None, description="Height of user box"),
):
    """
    If x/y/width/height are provided (from a constrained-ratio drag box),
    crop at that position (enforcing the preset ratio). Otherwise, center-crop.
    Then resize to the preset's canonical size and return PNG.
    """
    if preset not in PRESETS:
        raise HTTPException(status_code=400, detail=f"Invalid preset '{preset}'. Choose: {', '.join(PRESETS.keys())}")
    if file.content_type not in ("image/png", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Please upload a PNG file.")

    try:
        raw = await file.read()
        img = Image.open(BytesIO(raw))
        img.load()

        meta = PRESETS[preset]
        target_ratio = meta["ratio"]
        target_size = meta["size"]

        if all(v is not None for v in (x, y, width, height)):
            cropped = utils.crop_at_position_with_ratio(img, target_ratio, x, y, width, height)
        else:
            cropped = utils.center_crop_to_ratio(img, target_ratio)

        resized = utils.resize_image(cropped, target_size)
        return pil_to_png_response(resized, filename=f"{preset}_crop_{file.filename or 'image'}.png")

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cropping failed: {str(e)}")

# ---- NEW: Batch endpoint ----
@app.post("/crop/custom/batch", summary="Batch preset crop → returns a ZIP of PNGs")
async def crop_custom_batch(
    files: List[UploadFile] = File(..., description="One or more PNGs"),
    preset: str = Query(..., description="story | post | shopee | amazon"),
    # Optional JSON mapping filenames to crop boxes:
    # {"img1.png":{"x":10,"y":20,"width":500,"height":700}, "img2.png": {...}}
    boxes: Optional[str] = Form(None),
):
    """
    Apply the selected preset to all uploaded PNGs.
    If 'boxes' JSON is provided, use a per-file box (matched by filename); else center-crop.
    Returns application/zip. Any per-file errors are included as ERROR_*.txt in the zip.
    """
    if preset not in PRESETS:
        raise HTTPException(status_code=400, detail=f"Invalid preset '{preset}'. Choose: {', '.join(PRESETS.keys())}")

    try:
        boxes_map = json.loads(boxes) if boxes else {}
        if boxes and not isinstance(boxes_map, dict):
            raise ValueError("'boxes' must be a JSON object keyed by filename.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid 'boxes' JSON.")

    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            if f.content_type not in ("image/png", "application/octet-stream"):
                # Put an error note inside the zip rather than failing whole batch
                zf.writestr(f"ERROR_{f.filename or 'unknown'}.txt", "Please upload a PNG file.")
                continue

            raw = await f.read()
            box = boxes_map.get(f.filename) if boxes_map else None

            try:
                out_name, out_png = _process_one_png(raw, f.filename, preset, box)
                zf.writestr(out_name, out_png)
            except ValueError as ve:
                zf.writestr(f"ERROR_{f.filename or 'unknown'}.txt", str(ve))
            except Exception as e:
                zf.writestr(f"ERROR_{f.filename or 'unknown'}.txt", f"Cropping failed: {str(e)}")

    zip_buf.seek(0)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="batch_crops.zip"'},
        background=BackgroundTask(lambda: None),  # placeholder cleanup
    )

# Optional: local dev entrypoint
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)
