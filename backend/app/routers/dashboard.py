from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.schemas.finance import ChartDataPoint, DashboardSummaryResponse
from app.services.finance_service import FinanceService


router = APIRouter(tags=["dashboard"])
service = FinanceService()


@router.get("/api/dashboard-summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(user_id: int = Depends(get_current_user_id)) -> dict:
    return service.get_dashboard_summary(user_id)


@router.get("/api/chart-data", response_model=list[ChartDataPoint])
def get_chart_data(user_id: int = Depends(get_current_user_id)) -> list[dict]:
    transactions = service.list_transactions(user_id)
    monthly = {}
    month_names = {
        "01": "Jan",
        "02": "Fev",
        "03": "Mar",
        "04": "Abr",
        "05": "Mai",
        "06": "Jun",
        "07": "Jul",
        "08": "Ago",
        "09": "Set",
        "10": "Out",
        "11": "Nov",
        "12": "Dez",
    }

    for transaction in transactions:
        month_key = transaction["date"][:7]
        month_label = month_names.get(month_key[5:7], month_key)
        monthly.setdefault(
            month_key,
            {
                "name": month_label,
                "income": 0.0,
                "expense": 0.0,
                "total": 0.0,
            },
        )
        amount = float(transaction["amount"])
        if transaction["type"] == "income":
            monthly[month_key]["income"] += amount
            monthly[month_key]["total"] += amount
        else:
            monthly[month_key]["expense"] += amount
            monthly[month_key]["total"] -= amount

    return [monthly[key] for key in sorted(monthly.keys())]
