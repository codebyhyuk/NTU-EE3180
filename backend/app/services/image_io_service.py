import io
import uuid
import zipfile
from pathlib import Path
from typing import List, Optional
from PIL import Image
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

OUTPUTS_ROOT = Path(__file__).resolve().parents[1] / "outputs"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
STEPS = ["remove_bg", "shadow", "crop"]
MIN_WIDTH = 512
MIN_HEIGHT = 512

def new_batch_id() -> str:
    return uuid.uuid4().hex[:12]

def short_uid() -> str:
    return uuid.uuid4().hex[:6]

def validate_ext(filename: str) -> None:
    if Path(filename).suffix.lower() not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type")

def to_png_rgba_bytes(data: bytes) -> bytes:
    from io import BytesIO
    with Image.open(BytesIO(data)) as im:
        if im.width < MIN_WIDTH or im.height < MIN_HEIGHT:
            raise HTTPException(status_code=400, detail=f"Image too small: {im.width}x{im.height}. Minimum is {MIN_WIDTH}x{MIN_HEIGHT}.")
        out = BytesIO()
        im.convert("RGBA").save(out, format="PNG")
        return out.getvalue()

def save_step_png(batch_id: str, step: str, filename: str, png_bytes: bytes) -> str:
    out_dir = OUTPUTS_ROOT / batch_id / step
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / filename
    with open(path, "wb") as f:
        f.write(png_bytes)
    return str(path)

def list_step_paths(batch_id: str, step: str) -> List[Path]:
    base = OUTPUTS_ROOT / batch_id / step
    if not base.exists():
        return []
    return sorted(p for p in base.glob("*.png") if p.is_file())

def detect_latest_step(batch_id: str) -> Optional[str]:
    for step in reversed(STEPS):
        if any(list_step_paths(batch_id, step)):
            return step
    return None

def zip_paths_for_batch_step(batch_id: str, step: str) -> StreamingResponse:
    paths = list_step_paths(batch_id, step)
    if not paths:
        raise HTTPException(status_code=404, detail=f"No files for batch {batch_id} step {step}")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in paths:
            z.write(p, arcname=p.name)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={batch_id}-{step}.zip"}
    )
