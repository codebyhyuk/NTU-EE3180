import io
import zipfile
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image
from fastapi.responses import StreamingResponse
from ..services.image_io_service import save_step_png  # 배치 저장용

class ImageCropService:
    PRESETS = {
        "instagram": {"ratio": 1.0, "size": (1080, 1080)},
        "shopee": {"ratio": 5 / 4, "size": (1350, 1080)},
        "amazon": {"ratio": 1.0, "size": (2000, 2000)},
    }

    @classmethod
    def pil_to_png_response(cls, img: Image.Image, filename: str = "cropped.png") -> StreamingResponse:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )

    @classmethod
    def process_one_png(
        cls,
        img_bytes: bytes,
        filename: str,
        preset: str,
        box: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, bytes]:
        if preset not in cls.PRESETS:
            raise ValueError(f"Invalid preset '{preset}'")

        meta = cls.PRESETS[preset]
        target_ratio = meta["ratio"]
        target_size = meta["size"]

        img = Image.open(io.BytesIO(img_bytes))
        img.load()

        if box and all(k in box for k in ("x", "y", "width", "height")):
            cropped = cls._crop_at_position_with_ratio(
                img,
                target_ratio,
                int(box["x"]),
                int(box["y"]),
                int(box["width"]),
                int(box["height"]),
            )
        else:
            cropped = cls._center_crop_to_ratio(img, target_ratio)

        resized = cls._resize_image(cropped, target_size)

        out_buf = io.BytesIO()
        resized.save(out_buf, format="PNG")
        return (f"{preset}_crop_{filename or 'image'}.png", out_buf.getvalue())

    @classmethod
    def batch_process_zip(
        cls,
        files: List[Tuple[str, bytes]],
        preset: str,
        boxes_map: Optional[Dict[str, Dict[str, Any]]] = None,
        batch_id: Optional[str] = None
    ) -> StreamingResponse:
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for filename, content in files:
                try:
                    box = boxes_map.get(filename) if boxes_map else None
                    out_name, out_png = cls.process_one_png(content, filename, preset, box)
                    if batch_id:
                        save_step_png(batch_id, "crop", out_name, out_png)
                    zf.writestr(out_name, out_png)
                except Exception as e:
                    zf.writestr(f"ERROR_{filename or 'unknown'}.txt", str(e))

        zip_buf.seek(0)
        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="batch_crops.zip"'}
        )

    @staticmethod
    def _center_crop_to_ratio(img: Image.Image, target_ratio: float) -> Image.Image:
        w, h = img.size
        current_ratio = w / h
        if abs(current_ratio - target_ratio) < 1e-3:
            return img
        if current_ratio > target_ratio:
            new_w = int(h * target_ratio)
            left = max(0, (w - new_w) // 2)
            box = (left, 0, left + new_w, h)
        else:
            new_h = int(w / target_ratio)
            top = max(0, (h - new_h) // 2)
            box = (0, top, w, top + new_h)
        return img.crop(box)

    @staticmethod
    def _crop_at_position_with_ratio(
        img: Image.Image,
        target_ratio: float,
        x: int,
        y: int,
        width: int,
        height: int,
    ) -> Image.Image:
        w, h = img.size
        width = max(1, min(width, w))
        height = max(1, min(height, h))
        x = max(0, min(x, w - 1))
        y = max(0, min(y, h - 1))

        cx = x + width / 2
        cy = y + height / 2

        if width / height > target_ratio:
            height = width / target_ratio
        else:
            width = height * target_ratio

        left = int(max(0, min(cx - width / 2, w - width)))
        top = int(max(0, min(cy - height / 2, h - height)))
        right = int(min(w, left + width))
        bottom = int(min(h, top + height))
        return img.crop((left, top, right, bottom))

    @staticmethod
    def _resize_image(img: Image.Image, size: Tuple[int, int]) -> Image.Image:
        return img.resize(size, Image.LANCZOS)
