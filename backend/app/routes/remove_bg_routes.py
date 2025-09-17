from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
import io, zipfile, asyncio
from pathlib import Path
from services.remove_bg_service import RemoveBGService

router = APIRouter()
svc = RemoveBGService()

def _png_name(name: str) -> str:
    return f"{Path(name).stem or 'image'}.png"

@router.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...), size: str = "auto"):
    img_bytes = await file.read()
    r = await svc.remove_background(img_bytes, file.filename or "upload.png", size)

    if r.status_code != 200:
        raise HTTPException(r.status_code, r.text)

    headers = {
        "Content-Disposition": f'inline; filename="output.png"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(iter([r.content]), media_type="image/png", headers=headers)

@router.post("/batch-remove-bg")
async def batch_remove_bg(
    files: List[UploadFile] = File(...),
    size: str = "auto",
    concurrent: int = 3,
    as_zip: bool = True
):
    if not files:
        raise HTTPException(400, "No files uploaded")

    contents = await asyncio.gather(*[f.read() for f in files])
    names = [f.filename or f"image_{i}.png" for i, f in enumerate(files)]

    sem = asyncio.Semaphore(max(1, min(concurrent, 8)))

    async def process_one(name: str, data: bytes):
        async with sem:
            r = await svc.remove_background(data, name, size)
            if r.status_code == 200:
                return {"filename": name, "ok": True, "content": r.content}
            return {"filename": name, "ok": False, "status": r.status_code, "error": r.text}

    results = await asyncio.gather(*[process_one(n, d) for n, d in zip(names, contents)])

    if as_zip:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
            for res in results:
                if res.get("ok"):
                    z.writestr(_png_name(res["filename"]), res["content"])
                else:
                    msg = f"Failed: {res.get('status')} {res.get('error','')}".strip()
                    z.writestr(f"{_png_name(res['filename'])}.error.txt", msg or "Unknown error")
        buf.seek(0)
        headers = {"Content-Disposition": 'attachment; filename="cutouts.zip"'}
        return StreamingResponse(buf, media_type="application/zip", headers=headers)

    return {
        "processed": len(results),
        "success": sum(1 for r in results if r.get("ok")),
        "failed": sum(1 for r in results if not r.get("ok")),
        "results": [{k: v for k, v in r.items() if k != "content"} for r in results],
    }
