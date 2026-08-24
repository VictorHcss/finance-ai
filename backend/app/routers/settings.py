from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.services.settings_service import SettingsService
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest

router = APIRouter(prefix="/api/settings", tags=["settings"])
service = SettingsService()


@router.get("", response_model=SettingsResponse)
def get_settings(user_id: int = Depends(get_current_user_id)) -> SettingsResponse:
    return SettingsResponse.from_row(service.get_settings(user_id))


@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdateRequest,
    user_id: int = Depends(get_current_user_id),
) -> SettingsResponse:
    row = service.update_settings(user_id, payload.model_dump(exclude_unset=True))
    return SettingsResponse.from_row(row)
