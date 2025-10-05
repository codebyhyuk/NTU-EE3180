import os
import httpx

class RemoveBGService:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("REMOVE_BG_API_KEY") or os.getenv("REMOVEBG_API_KEY")
        if not self.api_key:
            raise RuntimeError("REMOVE_BG_API_KEY (or REMOVEBG_API_KEY) missing")
        self.url = "https://api.remove.bg/v1.0/removebg"

    async def remove_background(self, png_bytes: bytes, size: str = "auto") -> bytes:
        headers = {"X-Api-Key": self.api_key}
        data = {"size": size, "format": "png"}
        files = {"image_file": ("image.png", png_bytes, "image/png")}
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(self.url, headers=headers, data=data, files=files)
        if r.status_code == 200:
            return r.content
        try:
            err = r.json()
        except Exception:
            err = {"detail": r.text}
        raise RuntimeError(f"remove.bg error {r.status_code}: {err}")

    async def batch_remove_background(self, items: list[tuple[str, bytes]], size: str = "auto", concurrent: int = 3) -> list[dict]:
        import asyncio
        sem = asyncio.Semaphore(max(1, min(concurrent, 8)))
        async def process_one(name: str, data: bytes):
            async with sem:
                try:
                    out_png = await self.remove_background(data, size=size)
                    return {"filename": name, "ok": True, "content": out_png}
                except Exception as e:
                    return {"filename": name, "ok": False, "error": str(e)}
        return await asyncio.gather(*(process_one(n, d) for n, d in items))
