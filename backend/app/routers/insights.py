from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.schemas.finance import InsightResponse
from app.services.insight_service import InsightService
from app.services.settings_service import SettingsService


router = APIRouter(tags=["insights"])
service = InsightService()
settings_service = SettingsService()


# Mesmo payload "zerado" usado quando ainda não há transações
# (ver InsightService.get_insights), mas com uma mensagem específica
# e ai_enabled=False — assim o frontend consegue distinguir "sem dados
# ainda" de "usuário desligou a IA de propósito" e mostrar cada caso
# de um jeito diferente, em vez de tratar os dois como a mesma tela vazia.
_DISABLED_RESPONSE: dict = {
    "ai_enabled": False,
    "alerta": "Os Insights de IA estão desativados nas suas Configurações.",
    "previsao_proximo_mes": 0,
    "economias_sugeridas": 0,
    "media_gastos": 0,
    "variacao_percentual": 0,
    "historico": [],
    "insights": [],
}


@router.get("/api/insights", response_model=InsightResponse)
def get_insights(user_id: int = Depends(get_current_user_id)) -> dict:
    # Antes, o toggle "Insights Semanais da IA" em Configurações ficava
    # salvo no banco mas nunca era consultado aqui — desligar o
    # interruptor não desligava nada de verdade. Agora a preferência é
    # checada antes de rodar qualquer análise.
    settings = settings_service.get_settings(user_id)
    if not bool(settings.get("ai_enabled", True)):
        return _DISABLED_RESPONSE

    result = service.get_insights(user_id)
    result["ai_enabled"] = True
    return result
