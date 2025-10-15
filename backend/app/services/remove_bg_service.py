import os
import io
import asyncio
from typing import Optional, Literal
import httpx
from PIL import Image, ImageOps, ImageFilter

def _infer_mime_from_name(name: str | None) -> str:
    if not name:
        return "application/octet-stream"
    s = name.lower()
    if s.endswith(".jpg") or s.endswith(".jpeg"):
        return "image/jpeg"
    if s.endswith(".png"):
        return "image/png"
    if s.endswith(".webp"):
        return "image/webp"
    return "application/octet-stream"

def _preprocess(image_bytes: bytes) -> bytes:
    b = io.BytesIO(image_bytes)
    im = Image.open(b).convert("RGB")
    w, h = im.size
    target = 1280
    if max(w, h) < target:
        scale = target / max(w, h)
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=2)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    out = io.BytesIO()
    im.save(out, format="JPEG", quality=95)
    return out.getvalue()

class RemoveBGError(RuntimeError):
    def __init__(self, status: int, payload):
        self.status = status
        self.payload = payload
        super().__init__(f"remove.bg error {status}: {payload}")

class RemoveBGService:
    def __init__(self, api_key: str | None = None, *, timeout_s: float = 60.0):
        self.api_key = api_key or os.getenv("REMOVE_BG_API_KEY") or os.getenv("REMOVEBG_API_KEY")
        if not self.api_key:
            raise RuntimeError("REMOVE_BG_API_KEY (or REMOVEBG_API_KEY) missing")
        self.url = "https://api.remove.bg/v1.0/removebg"
        self._timeout = httpx.Timeout(timeout_s)
        self._limits = httpx.Limits(max_keepalive_connections=10, max_connections=20)

    def _headers(self) -> dict:
        return {"X-Api-Key": self.api_key}

    @staticmethod
    def _retryable(status: int) -> bool:
        return status in (408, 409, 425, 429, 500, 502, 503, 504)

    async def _post(self, client: httpx.AsyncClient, data: dict, files: dict, *, max_retries: int = 2) -> httpx.Response:
        attempt = 0
        while True:
            try:
                r = await client.post(self.url, headers=self._headers(), data=data, files=files)
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RemoteProtocolError) as e:
                if attempt >= max_retries:
                    raise RemoveBGError(-1, f"{e!r}")
                await asyncio.sleep(0.8 * (2 ** attempt))
                attempt += 1
                continue
            if r.status_code == 200:
                return r
            if self._retryable(r.status_code) and attempt < max_retries:
                await asyncio.sleep(0.8 * (2 ** attempt))
                attempt += 1
                continue
            try:
                payload = r.json()
            except Exception:
                payload = r.text
            raise RemoveBGError(r.status_code, payload)

    async def remove_background(
        self,
        image_bytes: bytes,
        size: str = "auto",
        *,
        filename_hint: str | None = None,
        format: Literal["png", "jpg", "zip"] = "png",
        bg_color: Optional[str] = None,
        bg_image_url: Optional[str] = None,
    ) -> bytes:
        data: dict = {"size": size, "format": format}
        if bg_color:
            data["bg_color"] = bg_color
        if bg_image_url:
            data["bg_image_url"] = bg_image_url
        mime = _infer_mime_from_name(filename_hint)
        files = {"image_file": (filename_hint or "image", image_bytes, mime)}
        async with httpx.AsyncClient(timeout=self._timeout, limits=self._limits) as client:
            try:
                r = await self._post(client, data=data, files=files)
                return r.content
            except RemoveBGError as e:
                if isinstance(e.payload, dict) and any(err.get("code") == "unknown_foreground" for err in e.payload.get("errors", [])):
                    pp = _preprocess(image_bytes)
                    files2 = {"image_file": ("preprocessed.jpg", pp, "image/jpeg")}
                    r2 = await self._post(client, data=data, files=files2)
                    return r2.content
                raise e

    async def batch_remove_background(
        self,
        items: list[tuple[str, bytes]],
        size: str = "auto",
        concurrent: int = 3,
        *,
        format: Literal["png", "jpg", "zip"] = "png",
        bg_color: Optional[str] = None,
        bg_image_url: Optional[str] = None,
    ) -> list[dict]:
        sem = asyncio.Semaphore(max(1, min(concurrent, 16)))
        async def process_one(name: str, data: bytes):
            async with sem:
                try:
                    out_png = await self.remove_background(
                        data,
                        size=size,
                        filename_hint=name,
                        format=format,
                        bg_color=bg_color,
                        bg_image_url=bg_image_url,
                    )
                    return {"filename": name, "ok": True, "content": out_png}
                except Exception as e:
                    return {"filename": name, "ok": False, "error": str(e)}
        return await asyncio.gather(*(process_one(n, d) for n, d in items))
