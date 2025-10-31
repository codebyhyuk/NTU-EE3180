# image_io_routes
from typing import List, Optional
import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.image_io_service import (
    new_batch_id,
    list_step_paths,
    detect_latest_step,
    zip_paths_for_batch_step,
    save_original_uploads,
    load_step_items,
    allowed_step_regex,
)

router = APIRouter(prefix="/io", tags=["Image IO"])
STEP_PATTERN = allowed_step_regex()

class ZipFromPathsReq(BaseModel):
    paths: List[str]

@router.post("/batches/new")
async def io_batches_new():
    return {"batch_id": new_batch_id()}

@router.get("/batches/{batch_id}/list")
async def io_batches_list(batch_id: str, step: str = Query(..., pattern=STEP_PATTERN)):
    files = [str(p) for p in list_step_paths(batch_id, step)]
    return {"batch_id": batch_id, "step": step, "files": files}

@router.get("/batches/{batch_id}/latest-step")
async def io_batches_latest_step(batch_id: str):
    step = detect_latest_step(batch_id)
    return {"batch_id": batch_id, "latest_step": step}

@router.get("/export-zip")
async def io_export_zip_get(batch_id: str = Query(...), step: Optional[str] = Query(None, pattern=STEP_PATTERN)):
    step_to_zip = step or detect_latest_step(batch_id)
    if not step_to_zip:
        raise HTTPException(status_code=404, detail="No outputs found for this batch")
    return zip_paths_for_batch_step(batch_id, step_to_zip)

@router.post("/export-zip")
async def io_export_zip_post(req: ZipFromPathsReq):
    if not req.paths:
        raise HTTPException(status_code=400, detail="paths cannot be empty")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for s in req.paths:
            p = Path(s)
            if p.exists() and p.suffix.lower() == ".png":
                z.write(p, arcname=p.name)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=export.zip"})

@router.get("/batches/{batch_id}/steps/{step}/{filename}")
async def io_fetch_step_file(batch_id: str, step: str, filename: str):
    items = load_step_items(batch_id, step, filenames=[filename], include_bytes=False)
    if not items:
        raise HTTPException(status_code=404, detail="File not found")
    path = Path(items[0]["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")
    return StreamingResponse(
        path.open("rb"),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )

@router.post("/uploads")
async def io_upload_images(
    files: List[UploadFile] = File(...),
    batch_id: Optional[str] = Form(None),
    step: str = Form("input", pattern=STEP_PATTERN),
):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one file.")
    payloads = []
    for f in files:
        data = await f.read()
        name = f.filename or f"image_{len(payloads)+1}.png"
        payloads.append((name, data))
    result = save_original_uploads(payloads, batch_id=batch_id, step=step)
    return result
