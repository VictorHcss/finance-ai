from collections import Counter, defaultdict
from datetime import date, datetime
from statistics import mean
from typing import List

from app.core.categorization import format_category_label, normalize_category_key
from app.repositories.finance_repository import FinanceRepository


MONTHS_MAP = {
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


class InsightService:
    def __init__(self) -> None:
        self.repository = FinanceRepository()

    def get_insights(self, user_id: int) -> dict:
        transactions = self.repository.list_transactions(user_id)
        goals = self.repository.list_goals(user_id)

        if not transactions:
            return {
                "alerta": "Adicione transações para começar a receber insights personalizados.",
                "previsao_proximo_mes": 0,
                "economias_sugeridas": 0,
                "media_gastos": 0,
                "variacao_percentual": 0,
                "historico": [{"mes": "Sem dados", "valor": 0}],
                "insights": [
                    {
                        "id": "bootstrap",
                        "type": "opportunity",
                        "severity": "low",
                        "title": "Base de dados insuficiente",
                        "message": "Cadastre receitas e despesas para liberar análises mensais, recorrência e projeções.",
                        "metric_label": "Status",
                        "metric_value": "Aguardando dados",
                    }
                ],
            }

        monthly_expenses = defaultdict(float)
        monthly_incomes = defaultdict(float)
        monthly_category_expenses = defaultdict(lambda: defaultdict(float))
        # [month][category_key][description_key] -> total — usado só para
        # explicar (seção 12 do prompt) qual insight de categoria: quais
        # descrições concretas empurraram o gasto pra cima.
        category_description_totals = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
        category_totals = Counter()
        category_labels: dict = {}
        recurring_counter = Counter()
        recurring_amounts = defaultdict(float)

        today = date.today()
        current_month_key = today.strftime("%Y-%m")
        previous_month_date = date(today.year - 1, 12, 1) if today.month == 1 else date(today.year, today.month - 1, 1)
        previous_month_key = previous_month_date.strftime("%Y-%m")

        for transaction in transactions:
            transaction_date = self._parse_date(transaction["date"])
            month_key = transaction_date.strftime("%Y-%m")
            description_key = transaction["description"].strip().lower()
            amount = float(transaction["amount"])
            # Duas grafias da mesma categoria ("Alimentação" e
            # "alimentação") devem somar juntas — agrupa por uma chave
            # normalizada e guarda um rótulo amigável pra exibição,
            # sem alterar o dado original armazenado.
            category_key = normalize_category_key(transaction["category"])
            if category_key not in category_labels:
                category_labels[category_key] = format_category_label(transaction["category"])

            if transaction["type"] == "expense":
                monthly_expenses[month_key] += amount
                monthly_category_expenses[month_key][category_key] += amount
                category_description_totals[month_key][category_key][description_key] += amount
                category_totals[category_key] += amount
                recurring_counter[description_key] += 1
                recurring_amounts[description_key] += amount
            else:
                monthly_incomes[month_key] += amount

        ordered_months = sorted(set(monthly_expenses.keys()) | set(monthly_incomes.keys()))
        expense_history = [
            {
                "mes": MONTHS_MAP.get(month.split("-")[1], month),
                "valor": round(monthly_expenses.get(month, 0), 2),
            }
            for month in ordered_months[-6:]
        ] or [{"mes": "Sem dados", "valor": 0}]

        current_expenses = monthly_expenses.get(current_month_key, 0.0)
        previous_expenses = monthly_expenses.get(previous_month_key, 0.0)
        current_incomes = monthly_incomes.get(current_month_key, 0.0)
        previous_incomes = monthly_incomes.get(previous_month_key, 0.0)

        expense_values = [item["valor"] for item in expense_history]
        media_gastos = round(mean(expense_values), 2) if expense_values else 0.0
        variacao_percentual = 0.0
        if previous_expenses > 0:
            variacao_percentual = round(((current_expenses - previous_expenses) / previous_expenses) * 100, 1)

        forecast_expenses = self._forecast_end_of_month(current_expenses, today)
        potential_savings = round(max(current_expenses - media_gastos, 0) * 0.35, 2)

        top_category = max(monthly_category_expenses[current_month_key].items(), key=lambda item: item[1], default=(None, 0.0))
        recurring_items = [
            (label, total)
            for label, total in recurring_amounts.items()
            if recurring_counter[label] >= 2
        ]
        recurring_items.sort(key=lambda item: item[1], reverse=True)

        available_monthly_savings = max(current_incomes - current_expenses, 0.0)
        active_goals = [goal for goal in goals if not goal["completed"]]

        insights = []

        if top_category[0]:
            top_category_label = category_labels.get(top_category[0], top_category[0])
            category_share = (top_category[1] / current_expenses) * 100 if current_expenses > 0 else 0
            insights.append(
                {
                    "id": "top-category",
                    "type": "expense",
                    "severity": "high" if category_share >= 35 else "medium",
                    "title": "Categoria dominante de gasto",
                    "message": (
                        f"{top_category_label} concentrou {category_share:.0f}% das saídas do mês, "
                        f"somando R$ {top_category[1]:.2f}."
                    ),
                    "metric_label": "Maior categoria",
                    "metric_value": top_category_label,
                }
            )

        # Análise de comportamento: qual categoria mais aumentou de gasto
        # em relação ao mês anterior, com explicabilidade (seções 9 e 12
        # do prompt) — de onde vem o número, não só o número em si.
        # Só gera a análise quando há uma base no mês anterior pra
        # comparar (sem isso seria "falsa precisão", proibido na seção 6).
        current_category_map = monthly_category_expenses.get(current_month_key, {})
        previous_category_map = monthly_category_expenses.get(previous_month_key, {})
        behavior_change_key = None
        behavior_change_diff = 0.0
        behavior_current_value = 0.0
        behavior_previous_value = 0.0
        for cat_key, current_amount in current_category_map.items():
            previous_amount = previous_category_map.get(cat_key, 0.0)
            if previous_amount <= 0:
                continue
            diff = current_amount - previous_amount
            if diff > behavior_change_diff:
                behavior_change_diff = diff
                behavior_change_key = cat_key
                behavior_current_value = current_amount
                behavior_previous_value = previous_amount

        if behavior_change_key:
            behavior_label = category_labels.get(behavior_change_key, behavior_change_key)
            behavior_percentage = (behavior_change_diff / behavior_previous_value) * 100
            contributors_map = category_description_totals[current_month_key][behavior_change_key]
            top_contributors = sorted(contributors_map.items(), key=lambda item: item[1], reverse=True)[:3]
            insights.append(
                {
                    "id": "category-behavior-change",
                    "type": "expense",
                    "severity": "high" if behavior_percentage >= 30 else "medium",
                    "title": "Mudança de comportamento detectada",
                    "message": (
                        f"Seus gastos com {behavior_label} aumentaram {behavior_percentage:.0f}% "
                        f"em relação ao mês anterior."
                    ),
                    "metric_label": "Categoria",
                    "metric_value": behavior_label,
                    "explanation": {
                        "current_period_label": "Este mês",
                        "previous_period_label": "Mês anterior",
                        "current_value": round(behavior_current_value, 2),
                        "previous_value": round(behavior_previous_value, 2),
                        "difference": round(behavior_change_diff, 2),
                        "percentage": round(behavior_percentage, 1),
                        "top_contributors": [
                            {"label": label.title(), "value": round(value, 2)}
                            for label, value in top_contributors
                        ],
                    },
                }
            )

        if recurring_items:
            recurring_label, recurring_total = recurring_items[0]
            insights.append(
                {
                    "id": "recurring-expense",
                    "type": "expense",
                    "severity": "medium",
                    "title": "Despesa recorrente detectada",
                    "message": (
                        f"'{recurring_label.title()}' apareceu {recurring_counter[recurring_label]} vezes "
                        f"e já consumiu R$ {recurring_total:.2f}."
                    ),
                    "metric_label": "Recorrência",
                    "metric_value": str(recurring_counter[recurring_label]),
                }
            )

        if current_incomes > 0:
            fixed_ratio = (current_expenses / current_incomes) * 100
            insights.append(
                {
                    "id": "cashflow-health",
                    "type": "cashflow",
                    "severity": "high" if fixed_ratio >= 85 else "medium" if fixed_ratio >= 70 else "low",
                    "title": "Pressão no fluxo de caixa",
                    "message": (
                        f"Seus gastos consumiram {fixed_ratio:.0f}% da receita do mês. "
                        f"O saldo disponível atual é de R$ {max(current_incomes - current_expenses, 0):.2f}."
                    ),
                    "metric_label": "Comprometimento",
                    "metric_value": f"{fixed_ratio:.0f}%",
                }
            )

        if previous_incomes > 0:
            income_growth = ((current_incomes - previous_incomes) / previous_incomes) * 100
            insights.append(
                {
                    "id": "income-trend",
                    "type": "income",
                    "severity": "low" if income_growth >= 0 else "medium",
                    "title": "Tendência de receitas",
                    "message": (
                        f"As receitas variaram {income_growth:.1f}% em relação ao mês anterior."
                    ),
                    "metric_label": "Receita atual",
                    "metric_value": f"R$ {current_incomes:.2f}",
                }
            )

        if active_goals:
            next_goal = min(
                active_goals,
                key=lambda goal: max(float(goal["target_amount"]) - float(goal["current_amount"]), 0),
            )
            missing = max(float(next_goal["target_amount"]) - float(next_goal["current_amount"]), 0)
            estimated_months = (missing / available_monthly_savings) if available_monthly_savings > 0 else 0
            if available_monthly_savings > 0:
                message = (
                    f"No ritmo atual, a meta '{next_goal['name']}' pode ser concluída em "
                    f"aproximadamente {max(1, round(estimated_months))} meses."
                )
                severity = "low" if estimated_months <= 6 else "medium"
                metric_value = f"R$ {available_monthly_savings:.2f}/mês"
            else:
                message = (
                    f"A meta '{next_goal['name']}' está sem folga mensal disponível; "
                    f"há risco de atraso se o padrão atual continuar."
                )
                severity = "high"
                metric_value = "Sem folga"

            insights.append(
                {
                    "id": "goal-forecast",
                    "type": "goal",
                    "severity": severity,
                    "title": "Projeção de metas",
                    "message": message,
                    "metric_label": "Capacidade mensal",
                    "metric_value": metric_value,
                }
            )

        if forecast_expenses > current_incomes and current_incomes > 0:
            insights.append(
                {
                    "id": "deficit-risk",
                    "type": "risk",
                    "severity": "high",
                    "title": "Risco de déficit",
                    "message": (
                        f"Se o ritmo de saídas continuar, o mês pode fechar em R$ {forecast_expenses:.2f} "
                        f"de despesas, acima da receita atual."
                    ),
                    "metric_label": "Previsão",
                    "metric_value": f"R$ {forecast_expenses:.2f}",
                }
            )

        insights = insights[:6]
        self.repository.replace_insights(user_id, insights)

        primary_alert = insights[0]["message"] if insights else "Os dados estão estáveis neste momento."

        # Resumo financeiro mensal (seção 10 do prompt): visão consolidada
        # do mês atual, funciona igual no modo LocalStorage.
        top_categories_month = sorted(
            current_category_map.items(), key=lambda item: item[1], reverse=True
        )[:3]
        resumo_mensal = {
            "month_label": f"{MONTHS_MAP.get(current_month_key.split('-')[1], current_month_key)}/{current_month_key.split('-')[0][2:]}",
            "incomes": round(current_incomes, 2),
            "expenses": round(current_expenses, 2),
            "balance": round(current_incomes - current_expenses, 2),
            "top_categories": [
                {
                    "category": category_labels.get(cat_key, cat_key),
                    "total": round(total, 2),
                    "percentage": round((total / current_expenses) * 100, 1) if current_expenses > 0 else 0.0,
                }
                for cat_key, total in top_categories_month
            ],
            "income_trend_percentage": (
                round(((current_incomes - previous_incomes) / previous_incomes) * 100, 1)
                if previous_incomes > 0
                else 0.0
            ),
            "expense_trend_percentage": variacao_percentual,
        }

        return {
            "alerta": primary_alert,
            "previsao_proximo_mes": round(max(forecast_expenses, media_gastos), 2),
            "economias_sugeridas": potential_savings,
            "media_gastos": media_gastos,
            "variacao_percentual": variacao_percentual,
            "historico": expense_history,
            "insights": insights,
            "resumo_mensal": resumo_mensal,
        }

    @staticmethod
    def _parse_date(value: str) -> datetime:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.strptime(value[:10], "%Y-%m-%d")

    @staticmethod
    def _forecast_end_of_month(current_value: float, today: date) -> float:
        if today.day <= 0:
            return round(current_value, 2)

        next_month = date(today.year + (1 if today.month == 12 else 0), 1 if today.month == 12 else today.month + 1, 1)
        days_in_month = (next_month - date(today.year, today.month, 1)).days
        daily_average = current_value / today.day
        return round(daily_average * days_in_month, 2)
