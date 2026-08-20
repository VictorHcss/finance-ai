from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.schemas.finance import DepositCreate, GoalCreate
from app.services.finance_service import FinanceService


router = APIRouter(prefix="/api/goals", tags=["goals"])
service = FinanceService()


@router.post("")
def create_goal(goal: GoalCreate, user_id: int = Depends(get_current_user_id)) -> dict:
    return service.create_goal(user_id, goal.model_dump())


@router.get("/status")
def get_goals_status(user_id: int = Depends(get_current_user_id)) -> list[dict]:
    return service.list_goals_status(user_id)


@router.post("/{goal_id}/deposit")
def deposit_goal(
    goal_id: int,
    deposit: DepositCreate,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    return service.deposit_goal(user_id, goal_id, deposit.amount)


@router.post("/{goal_id}/complete")
def complete_goal(goal_id: int, user_id: int = Depends(get_current_user_id)) -> dict:
    return service.complete_goal(user_id, goal_id)


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, user_id: int = Depends(get_current_user_id)) -> dict:
    return service.delete_goal(user_id, goal_id)
