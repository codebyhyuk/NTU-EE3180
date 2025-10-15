import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from typing import Optional
from PIL import Image
from . import utils

# Load backend/.env
# If this file lives at backend/app/main.py, go up one level to backend/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Parse comma-separated origins → list
raw_origins = os.getenv("CORS_ORIGINS", "")
ALLOW_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()] or ["*"]

app = FastAPI(title="E009 Custom Cropper", version="2.1.0")

# (Optional) CORS – set your front-end origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRESETS = {
    "story":  {"ratio": 9 / 16, "size": (1080, 1920)},
    "post":   {"ratio": 1.0,    "size": (1080, 1080)},
    "shopee": {"ratio": 4 / 5,  "size": (1080, 1350)},
}

def pil_to_png_response(img: Image.Image, filename: str = "cropped.png") -> StreamingResponse:
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png",
                             headers={"Content-Disposition": f'inline; filename="{filename}"'})

@app.get("/", include_in_schema=False)
def health():
    return {"ok": True, "service": "E009 Custom Cropper"}

@app.post("/crop/custom", summary="Preset crop (story/post/shopee). Optional user box to choose position.")
async def crop_custom(
    file: UploadFile = File(..., description="Processed PNG"),
    preset: str = Query(..., description="story | post | shopee"),
    # Optional user-dragged box (in image-native pixels). Send these as multipart form fields.
    x: Optional[int] = Form(None, description="Top-left X of user box"),
    y: Optional[int] = Form(None, description="Top-left Y of user box"),
    width: Optional[int] = Form(None, description="Width of user box"),
    height: Optional[int] = Form(None, description="Height of user box"),
):
    """
    If x/y/width/height are provided (from a constrained-ratio drag box),
    we crop at that position (enforcing the preset ratio). Otherwise, we center-crop.
    Then we resize to the preset's canonical size and return PNG.
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

        # Choose crop mode
        if all(v is not None for v in (x, y, width, height)):
            # User positioned box (your frontend should constrain the drag to this ratio)
            cropped = utils.crop_at_position_with_ratio(img, target_ratio, x, y, width, height)
        else:
            # Default: center crop
            cropped = utils.center_crop_to_ratio(img, target_ratio)

        resized = utils.resize_image(cropped, target_size)
        return pil_to_png_response(resized, filename=f"{preset}_crop_{file.filename or 'image'}.png")

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cropping failed: {str(e)}")

