import io
from pathlib import Path
from typing import Optional, Tuple

import requests
from PIL import Image, ImageFilter
from openai import OpenAI


class Text2ImageService:
    OUTPUT_DIR = Path(__file__).resolve().parents[1] / "outputs"

    def __init__(self):
        self.client = OpenAI()

    def build_prompt(self, base_prompt: str, option: int) -> str:
        base_prompt = base_prompt.strip()
        if not base_prompt:
            raise ValueError("Prompt cannot be empty")
        extra = {
            1: "Place the subject in a scene that matches the description with cinematic lighting and keep a realistic contact shadow beneath the subject.",
            2: "Create an atmospheric background described above with soft even lighting and make the subject look like it is floating with no visible shadows.",
            3: "Keep the background a pure white seamless studio wall while maintaining only a subtle grounded shadow under the subject.",
            4: "Return the subject exactly as provided without modifying the background."
        }
        if option not in extra:
            raise ValueError("Invalid option: must be 1–4")
        return f"{base_prompt}. {extra[option]}"

    def _generate_dalle_background(self, prompt: str) -> bytes:
        try:
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=1,
                size="1024x1024",
            )
            image_url = response.data[0].url
            image_data = requests.get(image_url, timeout=60).content
            return image_data
        except Exception as e:
            raise RuntimeError(f"Background generation failed: {e}")

    def _solid_background(self, size: Tuple[int, int], color=(255, 255, 255)) -> bytes:
        img = Image.new("RGBA", size, (*color, 255))
        return self._image_to_bytes(img)

    def prepare_background(self, prompt: str, option: int, size: Tuple[int, int]) -> Optional[bytes]:
        if option in (1, 2):
            dalle_prompt = self.build_prompt(prompt, option)
            return self._generate_dalle_background(dalle_prompt)
        if option == 3:
            return self._solid_background(size, color=(255, 255, 255))
        # option 4 skips background replacement
        return None

    def composite_images(
        self,
        foreground_bytes: bytes,
        option: int,
        *,
        mask_bytes: Optional[bytes] = None,
        background_bytes: Optional[bytes] = None,
    ) -> bytes:
        foreground = Image.open(io.BytesIO(foreground_bytes)).convert("RGBA")
        mask = (
            Image.open(io.BytesIO(mask_bytes)).convert("L")
            if mask_bytes
            else foreground.split()[-1]
        )
        if mask.size != foreground.size:
            mask = mask.resize(foreground.size, Image.LANCZOS)

        if background_bytes:
            background = Image.open(io.BytesIO(background_bytes)).convert("RGBA")
            background = background.resize(foreground.size, Image.LANCZOS)
        elif option == 4:
            # Skip background replacement: return the original transparent PNG
            return foreground_bytes
        else:
            background = Image.new("RGBA", foreground.size, (255, 255, 255, 255))

        if option in (1, 3):
            background = self._apply_shadow(background, mask)

        composite = background.copy()
        composite.paste(foreground, mask=mask)
        return self._image_to_bytes(composite)

    def _apply_shadow(self, background: Image.Image, mask: Image.Image) -> Image.Image:
        shadow = mask.copy().filter(ImageFilter.GaussianBlur(radius=25))
        shadow_layer = Image.new("RGBA", background.size, (0, 0, 0, 0))
        offset = (0, int(background.size[1] * 0.02))
        shadow_layer.paste((0, 0, 0, 120), box=offset, mask=shadow)
        return Image.alpha_composite(background, shadow_layer)

    @staticmethod
    def _image_to_bytes(img: Image.Image) -> bytes:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf.read()
