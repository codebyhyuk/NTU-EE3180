import os
import httpx
import io
import asyncio
import zipfile
from pathlib import Path

class RemoveBGService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("REMOVE_BG_API_KEY")
        if not self.api_key:
            raise RuntimeError("REMOVE_BG_API_KEY missing")
        self.url = "https://api.remove.bg/v1.0/removebg"

    def _png_name(self, name: str) -> str:
        return f"{Path(name).stem or 'image'}.png"

    async def remove_background(self, file_bytes: bytes, filename: str, size: str = "auto"):
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                self.url,
                files={"image_file": (filename, file_bytes)},
                data={"size": size},
                headers={"X-Api-Key": self.api_key},
            )
        return r

    async def batch_remove_background(self, files: list[tuple[str, bytes]], size: str = "auto", concurrent: int = 3):
        sem = asyncio.Semaphore(max(1, min(concurrent, 8)))

        async def process_one(name: str, data: bytes):
            async with sem:
                r = await self.remove_background(data, name, size)
                if r.status_code == 200:
                    return {"filename": name, "ok": True, "content": r.content}
                return {"filename": name, "ok": False, "status": r.status_code, "error": r.text}

        return await asyncio.gather(*[process_one(n, d) for n, d in files])

    def package_as_zip(self, results: list[dict]) -> io.BytesIO:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
            for res in results:
                if res.get("ok"):
                    z.writestr(self._png_name(res["filename"]), res["content"])
                else:
                    msg = f"Failed: {res.get('status')} {res.get('error','')}".strip()
                    z.writestr(f"{self._png_name(res['filename'])}.error.txt", msg or "Unknown error")
        buf.seek(0)
        return buf
