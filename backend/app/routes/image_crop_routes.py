import json
import zipfile
from io import BytesIO
from typing import Optional, List, Dict, Tuple

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
from fastapi.responses import StreamingResponse

from ..services.image_crop_service import ImageCropService
from ..services.image_io_service import (
    save_step_png,
    load_step_items,
    allowed_step_regex,
    new_batch_id,
)

router = APIRouter(prefix="/crop", tags=["Image Crop"])
STEP_PATTERN = allowed_step_regex()

@router.post("/custom")
@router.post("/custom/batch")
async def crop_custom(
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    preset: str = Query(..., description="instagram | shopee | amazon"),
    x: Optional[int] = Form(None),
    y: Optional[int] = Form(None),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    boxes: Optional[str] = Form(None),
    batch_id: Optional[str] = Form(None),
    source_step: str = Form("text2image", pattern=STEP_PATTERN),
    filenames: Optional[str] = Form(None),
    as_zip: int = Query(0),
):
    try:
        single_box = (
            {"x": x, "y": y, "width": width, "height": height}
            if all(v is not None for v in (x, y, width, height))
            else None
        )
        boxes_map = _parse_boxes_json(boxes)
        resolved_batch, payloads = await _collect_sources(
            primary_file=file,
            files=files,
            batch_id=batch_id,
            source_step=source_step,
            filenames_raw=filenames,
        )
        target_batch = resolved_batch or batch_id or new_batch_id()
        results, success_payloads = _run_crop_pipeline(
            payloads,
            preset=preset,
            boxes_map=boxes_map,
            single_box=single_box,
            batch_id=target_batch,
        )
        successes = [item for item in results if item["ok"]]
        if not successes:
            raise HTTPException(status_code=400, detail="Cropping failed for all images.")
        if as_zip and success_payloads:
            return _zip_response(target_batch, success_payloads)
        return {"batch_id": target_batch, "items": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cropping failed: {str(e)}")

def _parse_boxes_json(raw: Optional[str]) -> Dict[str, Dict[str, int]]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid 'boxes' JSON.")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="'boxes' must be a JSON object keyed by filename.")
    parsed: Dict[str, Dict[str, int]] = {}
    for key, value in data.items():
        if not isinstance(value, dict):
            raise HTTPException(status_code=400, detail=f"Invalid crop box for '{key}'.")
        try:
            parsed[key] = {
                "x": int(value["x"]),
                "y": int(value["y"]),
                "width": int(value["width"]),
                "height": int(value["height"]),
            }
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid crop box for '{key}'.")
    return parsed

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
    payloads: List[tuple[str, bytes]] = []
    if uploads:
        for f in uploads:
            if f.content_type not in ("image/png", "application/octet-stream"):
                raise HTTPException(status_code=400, detail="Please upload PNG files for cropping.")
            data = await f.read()
            if not data:
                raise HTTPException(status_code=400, detail=f"Uploaded file '{f.filename}' is empty.")
            payloads.append((f.filename or "image.png", data))
        return batch_id, payloads
    if not batch_id:
        raise HTTPException(status_code=400, detail="Provide uploads or a batch reference to crop.")
    names = _parse_filenames(filenames_raw)
    stored = load_step_items(batch_id, source_step, filenames=names, include_bytes=True)
    payloads.extend((item["filename"], item["bytes"]) for item in stored)
    return batch_id, payloads

def _parse_filenames(raw: Optional[str]) -> Optional[List[str]]:
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="'filenames' must be JSON.")
    if not isinstance(data, list) or any(not isinstance(item, str) for item in data):
        raise HTTPException(status_code=400, detail="'filenames' must be a JSON list of strings.")
    return data

def _run_crop_pipeline(
    payloads: List[tuple[str, bytes]],
    *,
    preset: str,
    boxes_map: Dict[str, Dict[str, int]],
    single_box: Optional[Dict[str, int]],
    batch_id: str,
) -> tuple[List[dict], List[Tuple[str, bytes]]]:
    results: List[dict] = []
    successes: List[Tuple[str, bytes]] = []
    for filename, content in payloads:
        try:
            box = boxes_map.get(filename) or single_box
            out_name, out_png = ImageCropService.process_one_png(content, filename, preset, box)
            saved_path = save_step_png(batch_id, "crop", out_name, out_png)
            successes.append((out_name, out_png))
            results.append(
                {
                    "ok": True,
                    "filename": filename,
                    "stored_filename": out_name,
                    "saved_path": saved_path,
                }
            )
        except Exception as e:
            results.append({"ok": False, "filename": filename, "error": str(e)})
    return results, successes

def _zip_response(batch_id: str, payloads: List[Tuple[str, bytes]]) -> StreamingResponse:
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in payloads:
            zf.writestr(name, content)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{batch_id}_crop.zip"'},
    )
