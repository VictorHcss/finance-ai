from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.schemas.finance import InsightResponse
from app.services.insight_service import InsightService


router = APIRouter(tags=["insights"])
service = InsightService()


@router.get("/api/insights", response_model=InsightResponse)
def get_insights(user_id: int = Depends(get_current_user_id)) -> dict:
    return service.get_insights(user_id)
