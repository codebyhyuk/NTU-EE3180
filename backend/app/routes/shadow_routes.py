from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from services.shadow_service import ShadowGenerationService

router = APIRouter()
shadow_service = ShadowGenerationService()

@router.post("")
async def generate_shadow(image: UploadFile = File(...)):
    try:
        result = await shadow_service.generate_single_shadow(image)
        return StreamingResponse(result["buffer"], media_type=result["media_type"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def generate_shadow_batch(images: list[UploadFile] = File(...)):
    try:
        result = await shadow_service.generate_batch_shadow(images)
        return FileResponse(
            result["path"],
            media_type=result["media_type"],
            headers={"Content-Disposition": "attachment; filename=shadows.zip"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
