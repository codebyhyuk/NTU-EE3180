#remove_bg_routes
import json
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException

from ..services.remove_bg_service import RemoveBGService
from ..services.image_io_service import (
    validate_ext,
    new_batch_id,
    short_uid,
    save_step_png,
    public_url,
    zip_paths_for_batch_step,
    load_step_items,
    allowed_step_regex,
)

router = APIRouter(prefix="/remove-bg", tags=["Remove BG"])
svc = RemoveBGService()
ERROR_HINT = "Background removal failed. Please upload a clearer photo and try again."
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

async def _prepare_uploads(files: List[UploadFile]) -> List[tuple[str, bytes]]:
    prepared: List[tuple[str, bytes]] = []
    for f in files:
        if not f:
            continue
        validate_ext(f.filename or "")
        raw = await f.read()
        name = f.filename or f"image_{len(prepared)+1}.png"
        prepared.append((name, raw))
    if not prepared:
        raise HTTPException(status_code=400, detail="No files uploaded")
    return prepared

async def _collect_sources(
    *,
    primary_file: Optional[UploadFile],
    files: Optional[List[UploadFile]],
    batch_id: Optional[str],
    source_step: str,
    filenames_raw: Optional[str],
) -> tuple[Optional[str], List[tuple[str, bytes]]]:
    uploads: List[UploadFile] = []
    if primary_file:
        uploads.append(primary_file)
    if files:
        uploads.extend(files)
    if uploads:
        prepared = await _prepare_uploads(uploads)
        return batch_id, prepared
    if batch_id:
        names = _parse_filename_list(filenames_raw)
        stored = load_step_items(batch_id, source_step, filenames=names, include_bytes=True)
        prepared = [(item["filename"], item["bytes"]) for item in stored]
        return batch_id, prepared
    raise HTTPException(status_code=400, detail="Provide uploads or a batch reference to process.")

async def _run_remove_bg_pipeline(
    prepared: List[tuple[str, bytes]],
    *,
    batch_id: Optional[str],
    size: str,
    bg_color: Optional[str],
    bg_image_url: Optional[str],
    concurrent: int,
) -> tuple[str, List[dict]]:
    bid = batch_id or new_batch_id()
    batch_results = await svc.batch_remove_background(
        prepared,
        size=size,
        format="png",
        bg_color=bg_color,
        bg_image_url=bg_image_url,
        concurrent=concurrent,
    )
    normalized: List[dict] = []
    for original, result in zip(prepared, batch_results):
        if result.get("ok"):
            out_name = f"{Path(original[0]).stem}_{short_uid()}.png"
            saved_path = save_step_png(bid, "remove_bg", out_name, result["content"])
            normalized.append(
                {
                    "filename": original[0],
                    "ok": True,
                    "saved_path": saved_path,
                    "stored_filename": out_name,
                    "public_url": public_url(bid, "remove_bg", out_name),
                }
            )
        else:
            normalized.append(
                {
                    "filename": original[0],
                    "ok": False,
                    "error": result.get("error", "Unknown remove.bg error"),
                }
            )
    return bid, normalized

@router.post("")
@router.post("/batch")
async def remove_bg_process(
    file: Optional[UploadFile] = File(None, description="jpg/png/webp"),
    files: Optional[List[UploadFile]] = File(None),
    batch_id: Optional[str] = Form(None),
    source_step: str = Form("input", pattern=STEP_PATTERN),
    filenames: Optional[str] = Form(None, description="JSON list of filenames to process"),
    size: str = Query("auto"),
    bg_color: Optional[str] = Query(None),
    bg_image_url: Optional[str] = Query(None),
    as_zip: int = Query(0),
    concurrent: int = Query(3, ge=1, le=16),
):
    try:
        resolved_batch, prepared = await _collect_sources(
            primary_file=file,
            files=files,
            batch_id=batch_id,
            source_step=source_step,
            filenames_raw=filenames,
        )
        bid, normalized = await _run_remove_bg_pipeline(
            prepared,
            batch_id=resolved_batch,
            size=size,
            bg_color=bg_color,
            bg_image_url=bg_image_url,
            concurrent=concurrent if len(prepared) > 1 else 1,
        )
        successes = [item for item in normalized if item["ok"]]
        failures = [item for item in normalized if not item["ok"]]
        if not successes:
            raise HTTPException(
                status_code=502,
                detail={"message": ERROR_HINT, "errors": [f["error"] for f in failures]},
            )
        if as_zip and successes:
            return zip_paths_for_batch_step(bid, "remove_bg")
        return {"batch_id": bid, "items": normalized, "failed": failures}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail={"message": ERROR_HINT, "errors": [str(e)]})
