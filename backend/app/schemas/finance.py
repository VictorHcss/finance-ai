from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.categorization import format_category_label
from app.core.security import sanitize_text


class TransactionCreate(BaseModel):
    description: str = Field(min_length=2, max_length=120)
    amount: float = Field(gt=0)
    type: Literal["income", "expense"]
    category: str = Field(min_length=2, max_length=60)
    date: str = Field(min_length=10, max_length=40)

    @field_validator("description", "date")
    @classmethod
    def sanitize_fields(cls, value: str) -> str:
        return sanitize_text(value)

    @field_validator("category")
    @classmethod
    def sanitize_category(cls, value: str) -> str:
        # Além de sanitizar, aplica uma capitalização amigável e
        # consistente ("alimentação" / "ALIMENTAÇÃO" -> "Alimentação")
        # para reduzir divergência de grafia em dados novos. O
        # agrupamento nos Insights, além disso, usa uma chave
        # normalizada (ver app/core/categorization.py), então mesmo
        # dados antigos com grafias diferentes somam corretamente.
        return format_category_label(sanitize_text(value))


class GoalCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: Optional[str] = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return sanitize_text(value)

    @field_validator("deadline")
    @classmethod
    def sanitize_deadline(cls, value: Optional[str]) -> Optional[str]:
        return sanitize_text(value) if value else value


class DepositCreate(BaseModel):
    amount: float = Field(gt=0)


class DashboardSummaryResponse(BaseModel):
    incomes: float
    expenses: float
    total: float
    balance_trend_percentage: float
    income_trend_percentage: float
    expense_trend_percentage: float
    expense_ratio: float


class ChartDataPoint(BaseModel):
    name: str
    income: float
    expense: float
    total: float


class InsightExplanationContributor(BaseModel):
    label: str
    value: float


class InsightExplanation(BaseModel):
    current_period_label: str
    previous_period_label: str
    current_value: float
    previous_value: float
    difference: float
    percentage: float
    top_contributors: List[InsightExplanationContributor] = []


class InsightEntry(BaseModel):
    id: str
    type: Literal["expense", "income", "cashflow", "goal", "risk", "opportunity"]
    severity: Literal["low", "medium", "high"]
    title: str
    message: str
    metric_label: Optional[str] = None
    metric_value: Optional[str] = None
    explanation: Optional[InsightExplanation] = None


class InsightHistoryPoint(BaseModel):
    mes: str
    valor: float


class MonthlySummaryCategory(BaseModel):
    category: str
    total: float
    percentage: float


class MonthlySummary(BaseModel):
    month_label: str
    incomes: float
    expenses: float
    balance: float
    top_categories: List[MonthlySummaryCategory] = []
    income_trend_percentage: float
    expense_trend_percentage: float


class InsightResponse(BaseModel):
    ai_enabled: bool = True
    alerta: str
    previsao_proximo_mes: float
    economias_sugeridas: float
    media_gastos: float
    variacao_percentual: float
    historico: List[InsightHistoryPoint]
    insights: List[InsightEntry]
    resumo_mensal: Optional[MonthlySummary] = None
