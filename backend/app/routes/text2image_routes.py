from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse # Use FileResponse for FastAPI
import shutil
from ..services.text2image_service import Text2ImageService

router = APIRouter()
svc = Text2ImageService()

@router.post('/create-composite-image')
async def create_composite_image_route(
    prompt: str = Form(...), 
    foreground_file: UploadFile = File(...), 
    mask_file: UploadFile = File(...)
):
    with open("temp_foreground.png", "wb") as buffer:
        shutil.copyfileobj(foreground_file.file, buffer)
    with open("temp_mask.png", "wb") as buffer:
        shutil.copyfileobj(mask_file.file, buffer)

    background_path = svc.generate_and_download_background(prompt)
    if not background_path:
        raise HTTPException(status_code=500, detail="Failed to generate background image from prompt")

    final_image_path = svc.composite_images(
        foreground_path="temp_foreground.png", 
        mask_path="temp_mask.png", 
        background_path=background_path
    )

    if final_image_path:
        return FileResponse(final_image_path, media_type='image/png')
    else:
        raise HTTPException(status_code=500, detail="Failed to create the final composite image")