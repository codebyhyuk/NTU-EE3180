#image_io_service
import io
import uuid
import zipfile
from pathlib import Path
from typing import List, Optional, Sequence, Tuple, Dict, Any

from PIL import Image
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

OUTPUTS_ROOT = Path(__file__).resolve().parents[1] / "outputs"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
STEPS: Tuple[str, ...] = ("input", "remove_bg", "text2image", "crop")
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

def ensure_step(step: str) -> str:
    if step not in STEPS:
        raise HTTPException(status_code=400, detail=f"Unknown pipeline step '{step}'")
    return step

def save_step_png(batch_id: str, step: str, filename: str, png_bytes: bytes) -> str:
    ensure_step(step)
    out_dir = OUTPUTS_ROOT / batch_id / step
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / filename
    with open(path, "wb") as f:
        f.write(png_bytes)
    return str(path)

def list_step_paths(batch_id: str, step: str) -> List[Path]:
    ensure_step(step)
    base = OUTPUTS_ROOT / batch_id / step
    if not base.exists():
        return []
    return sorted(p for p in base.glob("*.png") if p.is_file())

def detect_latest_step(batch_id: str) -> Optional[str]:
    for step in reversed(STEPS):
        if any(list_step_paths(batch_id, step)):
            return step
    return None

def load_step_items(
    batch_id: str,
    step: str,
    filenames: Optional[Sequence[str]] = None,
    *,
    include_bytes: bool = True,
) -> List[Dict[str, Any]]:
    """
    Load stored PNGs from a given pipeline step. When `filenames` is provided,
    it must be a sequence of exact matches and preserves the incoming order.
    """
    ensure_step(step)
    available = {p.name: p for p in list_step_paths(batch_id, step)}
    if not available:
        raise HTTPException(
            status_code=404,
            detail=f"No files found for batch '{batch_id}' step '{step}'.",
        )
    if filenames:
        selected_paths: List[Path] = []
        missing = []
        for name in filenames:
            path = available.get(name)
            if not path:
                missing.append(name)
            else:
                selected_paths.append(path)
        if missing:
            raise HTTPException(
                status_code=404,
                detail=f"Missing files for batch '{batch_id}' step '{step}': {', '.join(missing)}",
            )
    else:
        selected_paths = list(available.values())
    if not selected_paths:
        raise HTTPException(
            status_code=404,
            detail=f"No files selected for batch '{batch_id}' step '{step}'.",
        )
    items: List[Dict[str, Any]] = []
    for path in selected_paths:
        item: Dict[str, Any] = {"filename": path.name, "path": str(path)}
        if include_bytes:
            item["bytes"] = path.read_bytes()
        items.append(item)
    return items

def save_original_uploads(
    uploads: Sequence[tuple[str, bytes]],
    *,
    batch_id: Optional[str] = None,
    step: str = "input",
) -> dict:
    if not uploads:
        raise HTTPException(status_code=400, detail="No files to save")
    ensure_step(step)
    bid = batch_id or new_batch_id()
    saved = []
    for name, raw in uploads:
        validate_ext(name)
        png_bytes = to_png_rgba_bytes(raw)
        out_name = f"{Path(name).stem}_{short_uid()}.png"
        saved.append(
            {
                "original_filename": name,
                "stored_filename": out_name,
                "saved_path": save_step_png(bid, step, out_name, png_bytes),
            }
        )
    return {"batch_id": bid, "count": len(saved), "items": saved}

def allowed_step_regex() -> str:
    """Helper for FastAPI Query pattern."""
    return f"^({'|'.join(STEPS)})$"

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
