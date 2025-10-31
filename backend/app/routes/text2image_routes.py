import io
import json
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image

from ..services.text2image_service import Text2ImageService
from ..services.image_io_service import (
    save_step_png,
    new_batch_id,
    short_uid,
    public_url,
    load_step_items,
    allowed_step_regex,
)

router = APIRouter(prefix="/text2image", tags=["Text2Image"])
svc = Text2ImageService()
STEP_PATTERN = allowed_step_regex()

def _parse_filename_list(raw: Optional[str]) -> Optional[List[str]]:
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="'filenames' must be JSON.")
    if not isinstance(data, list) or any(not isinstance(item, str) for item in data):
        raise HTTPException(status_code=400, detail="'filenames' must be a JSON list of strings.")
    return data

@router.post("/generate")
@router.post("/generate-single")
@router.post("/batch-generate")
async def generate_text2image(
    option: int = Form(..., ge=1, le=4),
    prompt: str = Form(...),
    batch_id: Optional[str] = Form(None),
    source_step: str = Form("remove_bg", pattern=STEP_PATTERN),
    filenames: Optional[str] = Form(None, description="JSON list of filenames to use"),
    foreground: Optional[UploadFile] = File(None),
    mask: Optional[UploadFile] = File(None),
):
    try:
        sources = await _resolve_sources(
            batch_id=batch_id,
            source_step=source_step,
            filenames_raw=filenames,
            foreground=foreground,
        )
        if not sources:
            raise HTTPException(status_code=400, detail="No foreground images to process.")
        mask_bytes = await mask.read() if mask else None
        if mask_bytes and len(sources) != 1:
            raise HTTPException(status_code=400, detail="Mask upload is only supported for a single foreground.")
        target_batch = batch_id or new_batch_id()
        results = []
        first_fg_bytes = sources[0]["bytes"]
        with Image.open(io.BytesIO(first_fg_bytes)) as first_image:
            base_size = first_image.size
        base_background_bytes = svc.prepare_background(prompt, option, base_size)
        for idx, item in enumerate(sources):
            try:
                fg_bytes = item["bytes"]
                result_bytes = svc.composite_images(
                    foreground_bytes=fg_bytes,
                    mask_bytes=mask_bytes if mask_bytes and idx == 0 else None,
                    option=option,
                    background_bytes=base_background_bytes,
                )
                out_name = f"{Path(item['filename']).stem}_bg_{short_uid()}.png"
                saved_path = save_step_png(target_batch, "text2image", out_name, result_bytes)
                results.append(
                    {
                        "ok": True,
                        "filename": item["filename"],
                        "stored_filename": out_name,
                        "saved_path": saved_path,
                        "public_url": public_url(target_batch, "text2image", out_name),
                    }
                )
            except Exception as e:
                results.append({"ok": False, "filename": item["filename"], "error": str(e)})
        successes = [item for item in results if item["ok"]]
        if not successes:
            raise HTTPException(status_code=500, detail="Failed to generate backgrounds for all images.")
        return {"batch_id": target_batch, "items": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _resolve_sources(
    *,
    batch_id: Optional[str],
    source_step: str,
    filenames_raw: Optional[str],
    foreground: Optional[UploadFile],
) -> List[dict]:
    sources: List[dict] = []
    if foreground:
        data = await foreground.read()
        if not data:
            raise HTTPException(status_code=400, detail="Uploaded foreground is empty.")
        sources.append({"filename": foreground.filename or "foreground.png", "bytes": data})
        return sources
    if not batch_id:
        raise HTTPException(status_code=400, detail="batch_id is required when no upload is provided.")
    names = _parse_filename_list(filenames_raw)
    stored = load_step_items(batch_id, source_step, filenames=names, include_bytes=True)
    for item in stored:
        sources.append({"filename": item["filename"], "bytes": item["bytes"]})
    return sources
