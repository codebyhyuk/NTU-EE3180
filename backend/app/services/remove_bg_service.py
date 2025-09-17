import os
import httpx

class RemoveBGService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("REMOVE_BG_API_KEY")
        if not self.api_key:
            raise RuntimeError("REMOVE_BG_API_KEY missing")
        self.url = "https://api.remove.bg/v1.0/removebg"

    async def remove_background(self, file_bytes: bytes, filename: str, size: str = "auto"):
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                self.url,
                files={"image_file": (filename, file_bytes)},
                data={"size": size},
                headers={"X-Api-Key": self.api_key},
            )
        return r
