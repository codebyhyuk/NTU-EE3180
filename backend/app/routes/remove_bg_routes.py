from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
import asyncio
from ..services.remove_bg_service import RemoveBGService

router = APIRouter()
svc = RemoveBGService()

@router.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...), size: str = "auto"):
    img_bytes = await file.read()
    r = await svc.remove_background(img_bytes, file.filename or "upload.png", size)

    if r.status_code != 200:
        raise HTTPException(r.status_code, r.text)

    headers = {
        "Content-Disposition": 'inline; filename="output.png"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(iter([r.content]), media_type="image/png", headers=headers)


@router.post("/batch-remove-bg")
async def batch_remove_bg(
    files: List[UploadFile] = File(...),
    size: str = "auto",
    concurrent: int = 3,
    as_zip: bool = True,
):
    if not files:
        raise HTTPException(400, "No files uploaded")

    contents = await asyncio.gather(*[f.read() for f in files])
    names = [f.filename or f"image_{i}.png" for i, f in enumerate(files)]
    results = await svc.batch_remove_background(list(zip(names, contents)), size, concurrent)

    if as_zip:
        buf = svc.package_as_zip(results)
        headers = {"Content-Disposition": 'attachment; filename="cutouts.zip"'}
        return StreamingResponse(buf, media_type="application/zip", headers=headers)

    return {
        "processed": len(results),
        "success": sum(1 for r in results if r.get("ok")),
        "failed": sum(1 for r in results if not r.get("ok")),
        "results": [{k: v for k, v in r.items() if k != "content"} for r in results],
    }
