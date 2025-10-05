from typing import List, Optional
import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.image_io_service import (
    new_batch_id,
    list_step_paths,
    detect_latest_step,
    zip_paths_for_batch_step,
)

router = APIRouter()

class ZipFromPathsReq(BaseModel):
    paths: List[str]

@router.post("/io/batches/new")
async def io_batches_new():
    return {"batch_id": new_batch_id()}

@router.get("/io/batches/{batch_id}/list")
async def io_batches_list(batch_id: str, step: str = Query(..., pattern="^(remove_bg|shadow|crop)$")):
    files = [str(p) for p in list_step_paths(batch_id, step)]
    return {"batch_id": batch_id, "step": step, "files": files}

@router.get("/io/batches/{batch_id}/latest-step")
async def io_batches_latest_step(batch_id: str):
    step = detect_latest_step(batch_id)
    return {"batch_id": batch_id, "latest_step": step}

@router.get("/io/export-zip")
async def io_export_zip_get(batch_id: str = Query(...), step: Optional[str] = Query(None, pattern="^(remove_bg|shadow|crop)$")):
    step_to_zip = step or detect_latest_step(batch_id)
    if not step_to_zip:
        raise HTTPException(status_code=404, detail="No outputs found for this batch")
    return zip_paths_for_batch_step(batch_id, step_to_zip)

@router.post("/io/export-zip")
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
