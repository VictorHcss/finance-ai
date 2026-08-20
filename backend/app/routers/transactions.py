from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.schemas.finance import TransactionCreate
from app.services.finance_service import FinanceService


router = APIRouter(prefix="/api/transactions", tags=["transactions"])
service = FinanceService()


@router.post("")
def create_transaction(
    transaction: TransactionCreate,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    return service.create_transaction(user_id, transaction.model_dump())


@router.get("")
def list_transactions(user_id: int = Depends(get_current_user_id)) -> list[dict]:
    return service.list_transactions(user_id)


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, user_id: int = Depends(get_current_user_id)) -> dict:
    return service.delete_transaction(user_id, transaction_id)
