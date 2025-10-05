from pathlib import Path
import io
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from ..services.remove_bg_service import RemoveBGService
from ..services.image_io_service import (
    validate_ext,
    to_png_rgba_bytes,
    new_batch_id,
    short_uid,
    save_step_png,
    zip_paths_for_batch_step,
)

router = APIRouter()
svc = RemoveBGService()

@router.post("/remove-bg")
async def remove_bg_single(
    file: UploadFile = File(..., description="jpg/png/webp"),
    batch_id: Optional[str] = Form(None),
    size: str = Query("auto"),
    meta: int = Query(0),
):
    try:
        validate_ext(file.filename)
        raw = await file.read()
        png_rgba = to_png_rgba_bytes(raw)
        out_png = await svc.remove_background(png_rgba, size)
        bid = batch_id or new_batch_id()
        out_name = f"{Path(file.filename).stem}_{short_uid()}.png"
        saved_path = save_step_png(bid, "remove_bg", out_name, out_png)
        if meta:
            return JSONResponse({"batch_id": bid, "saved_path": saved_path})
        return StreamingResponse(io.BytesIO(out_png), media_type="image/png", headers={"Content-Disposition": f"inline; filename={out_name}"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/batch-remove-bg")
async def batch_remove_bg(
    files: List[UploadFile] = File(...),
    batch_id: Optional[str] = Form(None),
    size: str = Query("auto"),
    as_zip: int = Query(0),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    try:
        bid = batch_id or new_batch_id()
        prepared: list[tuple[str, bytes]] = []
        for f in files:
            validate_ext(f.filename)
            raw = await f.read()
            prepared.append((f.filename, to_png_rgba_bytes(raw)))
        batch = await svc.batch_remove_background(prepared, size=size)
        saved_paths: list[str] = []
        for res in batch:
            if res.get("ok"):
                out_name = f"{Path(res['filename']).stem}_{short_uid()}.png"
                saved_paths.append(save_step_png(bid, "remove_bg", out_name, res["content"]))
        if as_zip:
            return zip_paths_for_batch_step(bid, "remove_bg")
        return {"batch_id": bid, "results": [{"saved_path": p} for p in saved_paths]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
