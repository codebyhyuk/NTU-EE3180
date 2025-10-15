import os
import requests
import tempfile
import zipfile
from io import BytesIO
import json

class ShadowGenerationService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("CLAIDAI_API_KEY")
        if not self.api_key:
            raise RuntimeError("CLAIDAI_API_KEY missing")
        self.url = "https://api.claid.ai/v1/image/edit"

    def _call_claid_api(self, image_bytes: bytes, filename: str, view: str = "top", color: str | None = None):
        files = {
            "image": (filename, image_bytes, "image/png")
        }

        payload = {
            "scene": {
                "effect": "shadows",
                "view": view
            }
        }
        if color:
            payload["scene"]["color"] = color

        headers = {"Authorization": f"Bearer {self.api_key}"}

        response = requests.post(
            self.url,
            headers=headers,
            files=files,
            data={"payload": json.dumps(payload)},
            timeout=60,
        )

        if response.status_code != 200:
            raise Exception(f"Claid API failed ({response.status_code}): {response.text}")

        resp_json = response.json()
        tmp_url = resp_json.get("data", {}).get("output", {}).get("tmp_url")
        if not tmp_url:
            raise Exception(f"No output URL in response: {resp_json}")

        # Download Result
        result = requests.get(tmp_url, timeout=60)
        if result.status_code != 200:
            raise Exception(f"Failed to download result image: {result.status_code}")

        return BytesIO(result.content)

    async def generate_single_shadow(self, image):
        image_bytes = await image.read()
        buffer = self._call_claid_api(image_bytes, image.filename)
        return {"buffer": buffer, "media_type": "image/png"}

    async def generate_batch_shadow(self, images: list):
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
            tmp_zip_path = tmp_zip.name
            with zipfile.ZipFile(tmp_zip, "w") as zipf:
                for idx, image in enumerate(images):
                    try:
                        image_bytes = await image.read()
                        buffer = self._call_claid_api(image_bytes, image.filename)
                        zipf.writestr(f"shadow_{idx+1}_{image.filename}.png", buffer.getvalue())
                    except Exception as e:
                        zipf.writestr(f"error_{idx+1}_{image.filename}.txt", str(e))

        return {"path": tmp_zip_path, "media_type": "application/zip"}
