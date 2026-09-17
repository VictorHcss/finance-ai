from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import get_current_user_id
from app.schemas.import_schema import (
    ImportBatchSummary,
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportPreviewResponse,
)
from app.services.import_service import ImportService

router = APIRouter(prefix="/api/transactions/import", tags=["import"])
service = ImportService()


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
) -> dict:
    content = await file.read()
    if not file.filename:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado.")
    return service.preview(user_id, file.filename, content)


@router.post("/confirm", response_model=ImportConfirmResponse)
def confirm_import(
    payload: ImportConfirmRequest,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    return service.confirm(user_id, payload.batch_id, payload.rows)


@router.get("/batches", response_model=list[ImportBatchSummary])
def list_import_batches(user_id: int = Depends(get_current_user_id)) -> list:
    return service.list_batches(user_id)
