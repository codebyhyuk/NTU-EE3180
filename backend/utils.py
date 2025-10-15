from typing import Tuple, Optional
from PIL import Image

def ensure_png_rgba(img: Image.Image) -> Image.Image:
    if img.mode not in ("RGBA", "LA"):
        img = img.convert("RGBA")
    return img

# Crop at the center directly to target ratio
def center_crop_to_ratio(img: Image.Image, target_ratio: float) -> Image.Image:
    img = ensure_png_rgba(img)
    w, h = img.size
    cur = w / h
    if abs(cur - target_ratio) < 1e-3:
        return img
    if cur > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))

def _clamp(val: int, low: int, high: int) -> int:
    return max(low, min(high, val))

# Lets the user **choose the crop area** (by dragging) while keeping the same preset aspect ratio.
def crop_at_position_with_ratio(
    img: Image.Image,
    target_ratio: float,
    x: int,
    y: int,
    width: int,
    height: int,
) -> Image.Image:
    """
    Crop around a user-chosen box (x,y,width,height) while enforcing target_ratio (w/h).
    - (x,y) is TOP-LEFT in image-native pixels.
    - We adjust one dimension to match ratio, keep the box *center* as the anchor,
      then shift & shrink to ensure the rectangle stays within image bounds.
    """
    img = ensure_png_rgba(img)
    W, H = img.size

    # Center of user rectangle
    cx = x + width // 2
    cy = y + height // 2

    # Adjust size to target ratio
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be positive")
    cur_ratio = width / height
    if cur_ratio > target_ratio:
        # too wide → reduce width
        width = int(round(height * target_ratio))
    else:
        # too tall → reduce height
        height = int(round(width / target_ratio))

    # Build a box centered at (cx, cy)
    half_w, half_h = width // 2, height // 2
    left = cx - half_w
    top = cy - half_h
    right = left + width
    bottom = top + height

    # If out of bounds, shift the box inside
    if left < 0:
        right -= left  # move right the same amount
        left = 0
    if top < 0:
        bottom -= top
        top = 0
    if right > W:
        shift = right - W
        left -= shift
        right = W
    if bottom > H:
        shift = bottom - H
        top -= shift
        bottom = H

    # If still exceeding (image smaller than requested box), shrink to fit
    width = right - left
    height = bottom - top
    if width <= 0 or height <= 0:
        # Fallback to whole image if something went very wrong
        left, top, right, bottom = 0, 0, W, H
        # and re-enforce ratio by shrinking to max that fits
        if W / H > target_ratio:
            # too wide
            new_w = int(H * target_ratio)
            left = (W - new_w) // 2
            right = left + new_w
        else:
            # too tall
            new_h = int(W / target_ratio)
            top = (H - new_h) // 2
            bottom = top + new_h

    return img.crop((left, top, right, bottom))

def resize_image(img: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    return img.resize(target_size, Image.Resampling.LANCZOS)

