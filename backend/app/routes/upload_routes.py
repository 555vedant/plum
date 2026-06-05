import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.storage_service import upload_file

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):

    if not file:
        raise HTTPException(status_code=400, detail="No file was uploaded.")
    
    try:
        content = await file.read()
        storage_url = upload_file(content, file.filename)
        return {
            "id": str(uuid.uuid4()),
            "filename": file.filename,
            "storage_url": storage_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
