from collections import defaultdict
from datetime import datetime
from typing import List

from fastapi import HTTPException

from app.repositories.finance_repository import FinanceRepository


class FinanceService:
    def __init__(self) -> None:
        self.repository = FinanceRepository()

    def create_transaction(self, user_id: int, payload: dict) -> dict:
        self.repository.create_transaction(user_id, payload)
        return {"status": "success", "message": "Transação criada"}

    def list_transactions(self, user_id: int) -> List[dict]:
        return self.repository.list_transactions(user_id)

    def update_transaction(self, user_id: int, transaction_id: int, payload: dict) -> dict:
        updated_rows = self.repository.update_transaction(user_id, transaction_id, payload)
        if not updated_rows:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        return {"status": "success", "message": "Transação atualizada"}

    def delete_transaction(self, user_id: int, transaction_id: int) -> dict:
        deleted_rows = self.repository.delete_transaction(user_id, transaction_id)
        if not deleted_rows:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        return {"status": "success", "message": "Transação removida"}

    def create_goal(self, user_id: int, payload: dict) -> dict:
        self.repository.create_goal(user_id, payload)
        return {"status": "success", "message": "Meta criada"}

    def list_goals_status(self, user_id: int) -> List[dict]:
        goals = self.repository.list_goals(user_id)
        results = []
        for goal in goals:
            target = float(goal["target_amount"])
            current = float(goal["current_amount"])
            percent = round((current / target) * 100, 2) if target > 0 else 0
            missing = max(0.0, target - current)
            results.append(
                {
                    "id": goal["id"],
                    "goal_name": goal["name"],
                    "target": target,
                    "current": current,
                    "missing": round(missing, 2),
                    "percent": percent,
                    "deadline": goal.get("deadline"),
                    "completed": bool(goal["completed"]),
                }
            )
        return results

    def deposit_goal(self, user_id: int, goal_id: int, amount: float) -> dict:
        goal = self.repository.get_goal(user_id, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")

        new_amount = float(goal["current_amount"]) + amount
        completed = new_amount >= float(goal["target_amount"])
        self.repository.update_goal_progress(user_id, goal_id, new_amount, completed)
        return {
            "status": "success",
            "new_amount": round(new_amount, 2),
            "completed": completed,
        }

    def complete_goal(self, user_id: int, goal_id: int) -> dict:
        updated_rows = self.repository.complete_goal(user_id, goal_id)
        if not updated_rows:
            raise HTTPException(status_code=404, detail="Meta não encontrada")
        return {"status": "success", "message": "Meta concluída"}

    def delete_goal(self, user_id: int, goal_id: int) -> dict:
        deleted_rows = self.repository.delete_goal(user_id, goal_id)
        if not deleted_rows:
            raise HTTPException(status_code=404, detail="Meta não encontrada")
        return {"status": "success", "message": "Meta removida"}

    def get_dashboard_summary(self, user_id: int) -> dict:
        transactions = self.repository.list_transactions(user_id)
        incomes = round(sum(item["amount"] for item in transactions if item["type"] == "income"), 2)
        expenses = round(sum(item["amount"] for item in transactions if item["type"] == "expense"), 2)
        total = round(incomes - expenses, 2)

        monthly_balance = defaultdict(float)
        monthly_incomes = defaultdict(float)
        monthly_expenses = defaultdict(float)
        for transaction in transactions:
            month_key = self._to_month_key(transaction["date"])
            amount = transaction["amount"]
            if transaction["type"] == "income":
                monthly_balance[month_key] += amount
                monthly_incomes[month_key] += amount
            else:
                monthly_balance[month_key] -= amount
                monthly_expenses[month_key] += amount

        def month_over_month_trend(monthly_values: dict) -> float:
            """Compara o valor do mês mais recente com o do mês anterior
            a ele. Usado separadamente para saldo, entradas e saídas —
            antes, o frontend reaproveitava por engano a mesma variação
            de despesas para o card de Entradas também."""
            ordered = [value for _, value in sorted(monthly_values.items())]
            if len(ordered) < 2 or ordered[-2] == 0:
                return 0.0
            return round(((ordered[-1] - ordered[-2]) / abs(ordered[-2])) * 100, 1)

        trend = month_over_month_trend(monthly_balance)
        income_trend = month_over_month_trend(monthly_incomes)
        expense_trend = month_over_month_trend(monthly_expenses)

        expense_ratio = round((expenses / incomes) * 100, 2) if incomes > 0 else 0.0
        return {
            "incomes": incomes,
            "expenses": expenses,
            "total": total,
            "balance_trend_percentage": trend,
            "income_trend_percentage": income_trend,
            "expense_trend_percentage": expense_trend,
            "expense_ratio": expense_ratio,
        }

    @staticmethod
    def _to_month_key(date_value: str) -> str:
        try:
            return datetime.fromisoformat(date_value.replace("Z", "+00:00")).strftime("%Y-%m")
        except ValueError:
            return date_value[:7]
