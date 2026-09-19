from collections import defaultdict
from datetime import date, datetime
from math import ceil
from typing import List, Optional

from fastapi import HTTPException

from app.repositories.finance_repository import FinanceRepository


class FinanceService:
    def __init__(self) -> None:
        self.repository = FinanceRepository()

    # --- Transações ---

    def create_transaction(self, user_id: int, payload: dict) -> dict:
        goal_contribution = payload.pop("goal_contribution", None)
        transaction_id = self.repository.create_transaction(user_id, payload)

        response = {"status": "success", "message": "Transação criada", "id": transaction_id}
        if goal_contribution:
            response["goal_contribution"] = self._allocate_income_to_goal(
                user_id, payload, transaction_id, goal_contribution
            )
        return response

    def _allocate_income_to_goal(
        self, user_id: int, transaction_payload: dict, transaction_id: int, allocation: dict
    ) -> dict:
        # "Guardar parte dessa receita numa meta" (seção 2): o valor
        # destinado nunca vira uma despesa — é só uma contribuição no
        # cofrinho da meta, a transação de receita continua íntegra com
        # o valor cheio (seção 2 e 3 do pedido).
        if transaction_payload["type"] != "income":
            raise HTTPException(
                status_code=422,
                detail="Só é possível destinar valor de uma transação de receita para uma meta.",
            )
        if allocation["amount"] > transaction_payload["amount"]:
            raise HTTPException(
                status_code=422,
                detail="O valor destinado à meta não pode ser maior que o valor da receita.",
            )
        goal = self.repository.get_goal(user_id, allocation["goal_id"])
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")

        self.repository.create_contribution(
            user_id,
            goal["id"],
            "deposit",
            allocation["amount"],
            transaction_payload["description"],
            transaction_payload["date"],
            transaction_id=transaction_id,
        )
        updated_goal = self.repository.recompute_goal_balance(user_id, goal["id"])
        return {
            "goal_id": goal["id"],
            "goal_name": goal["name"],
            "amount": round(float(allocation["amount"]), 2),
            "new_balance": round(float(updated_goal["current_amount"]), 2),
        }

    def list_transactions(self, user_id: int) -> List[dict]:
        return self.repository.list_transactions(user_id)

    def update_transaction(self, user_id: int, transaction_id: int, payload: dict) -> dict:
        # Edição não cria nem altera uma alocação de meta nesta versão —
        # só cuida de não deixar uma alocação já existente ficar
        # inconsistente (seção 14 do pedido). Ver docs/GUIA-COFRINHO.md.
        payload.pop("goal_contribution", None)

        linked_contributions = self.repository.list_contributions_by_transaction(user_id, transaction_id)
        if linked_contributions:
            total_linked = sum(float(c["amount"]) for c in linked_contributions)
            if payload["type"] != "income" or float(payload["amount"]) < total_linked:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Essa transação tem R$ {total_linked:.2f} destinado a uma meta. "
                        "Remova a contribuição na meta antes de reduzir o valor ou mudar para despesa."
                    ),
                )

        updated_rows = self.repository.update_transaction(user_id, transaction_id, payload)
        if not updated_rows:
            raise HTTPException(status_code=404, detail="Transação não encontrada")

        if linked_contributions:
            # Mantém a data da contribuição sincronizada com a data da
            # transação editada — o valor da contribuição em si não muda
            # sozinho (só por ação explícita na meta).
            self.repository.sync_contribution_dates_for_transaction(user_id, transaction_id, payload["date"])

        return {"status": "success", "message": "Transação atualizada"}

    def delete_transaction(self, user_id: int, transaction_id: int) -> dict:
        linked_contributions = self.repository.list_contributions_by_transaction(user_id, transaction_id)
        affected_goal_ids = {c["goal_id"] for c in linked_contributions}

        deleted_rows = self.repository.delete_transaction(user_id, transaction_id)
        if not deleted_rows:
            raise HTTPException(status_code=404, detail="Transação não encontrada")

        # As contribuições vinculadas já foram removidas em cascata pelo
        # ON DELETE CASCADE da FK — falta só recalcular o saldo das
        # metas afetadas, senão current_amount ficaria com o valor de
        # antes da exclusão (dinheiro "fantasma" contado no cofrinho).
        for goal_id in affected_goal_ids:
            self.repository.recompute_goal_balance(user_id, goal_id)

        return {"status": "success", "message": "Transação removida"}

    # --- Metas ---

    def create_goal(self, user_id: int, payload: dict) -> dict:
        self.repository.create_goal(user_id, payload)
        return {"status": "success", "message": "Meta criada"}

    def list_goals_status(self, user_id: int) -> List[dict]:
        goals = self.repository.list_goals(user_id)
        today = date.today()
        results = []
        for goal in goals:
            target = float(goal["target_amount"])
            current = float(goal["current_amount"])
            percent = round((current / target) * 100, 2) if target > 0 else 0
            missing = max(0.0, target - current)
            contributions = self.repository.list_contributions(user_id, goal["id"])
            planning = self._compute_goal_planning(target, current, goal.get("deadline"), contributions, today)
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
                    "deadline_passed": planning["deadline_passed"],
                    "monthly_target": planning["monthly_target"],
                    "avg_monthly_contribution": planning["avg_monthly_contribution"],
                    "estimated_months": planning["estimated_months"],
                    "has_enough_history": planning["has_enough_history"],
                    "contributions_count": len(contributions),
                }
            )
        return results

    def update_goal(self, user_id: int, goal_id: int, payload: dict) -> dict:
        goal = self.repository.get_goal(user_id, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")

        # O valor já guardado (current_amount) não muda aqui — editar é só
        # nome/alvo/prazo. "completed" é recalculado a partir do valor já
        # guardado contra o novo alvo, igual ao depósito faz, para não
        # deixar uma meta com o rótulo "Concluída" desalinhado do valor
        # real depois que o alvo mudou.
        current_amount = float(goal["current_amount"])
        completed = current_amount >= payload["target_amount"]
        updated_rows = self.repository.update_goal(
            user_id,
            goal_id,
            payload["name"],
            payload["target_amount"],
            payload.get("deadline"),
            completed,
        )
        if not updated_rows:
            raise HTTPException(status_code=404, detail="Meta não encontrada")
        return {"status": "success", "message": "Meta atualizada"}

    def deposit_goal(self, user_id: int, goal_id: int, amount: float) -> dict:
        # "Guardar dinheiro" direto na meta (seção 4): igual a um
        # depósito manual, registrado como contribuição — nunca mais um
        # UPDATE direto em current_amount, pra sempre existir um
        # histórico por trás do saldo (seção 1 do pedido).
        goal = self.repository.get_goal(user_id, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")

        self.repository.create_contribution(
            user_id, goal_id, "deposit", amount, "Contribuição manual", date.today().isoformat()
        )
        updated = self.repository.recompute_goal_balance(user_id, goal_id)
        return {
            "status": "success",
            "new_amount": round(float(updated["current_amount"]), 2),
            "completed": bool(updated["completed"]),
        }

    def withdraw_goal(self, user_id: int, goal_id: int, amount: float) -> dict:
        # "Retirar dinheiro" do cofrinho (seção 6) — nunca vira despesa,
        # é só uma movimentação do dinheiro já reservado pra meta.
        goal = self.repository.get_goal(user_id, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")

        current_balance = self.repository.get_goal_balance(user_id, goal_id)
        if amount > current_balance:
            raise HTTPException(
                status_code=422,
                detail="Não é possível retirar mais do que o valor guardado nessa meta.",
            )

        self.repository.create_contribution(
            user_id, goal_id, "withdrawal", amount, "Retirada", date.today().isoformat()
        )
        updated = self.repository.recompute_goal_balance(user_id, goal_id)
        return {
            "status": "success",
            "new_amount": round(float(updated["current_amount"]), 2),
            "completed": bool(updated["completed"]),
        }

    def complete_goal(self, user_id: int, goal_id: int) -> dict:
        # Marcar como concluída manualmente continua existindo (era o
        # comportamento já existente antes do cofrinho), mas agora
        # registra a diferença como uma contribuição explícita — "de
        # onde veio" o salto até o alvo fica visível no histórico, em
        # vez de current_amount simplesmente pular pra target_amount
        # sem deixar rastro. Se o saldo real já alcança o alvo (ex.:
        # alguém completa a meta depois de já ter guardado o suficiente),
        # nenhuma contribuição extra é criada.
        goal = self.repository.get_goal(user_id, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")

        current_balance = self.repository.get_goal_balance(user_id, goal_id)
        gap = float(goal["target_amount"]) - current_balance
        if gap > 0:
            self.repository.create_contribution(
                user_id,
                goal_id,
                "deposit",
                gap,
                "Meta marcada como concluída manualmente",
                date.today().isoformat(),
            )
        self.repository.recompute_goal_balance(user_id, goal_id)
        return {"status": "success", "message": "Meta concluída"}

    def delete_goal(self, user_id: int, goal_id: int) -> dict:
        deleted_rows = self.repository.delete_goal(user_id, goal_id)
        if not deleted_rows:
            raise HTTPException(status_code=404, detail="Meta não encontrada")
        return {"status": "success", "message": "Meta removida"}

    # --- Cofrinho: histórico e contribuições manuais ---

    def list_goal_contributions(self, user_id: int, goal_id: int) -> List[dict]:
        goal = self.repository.get_goal(user_id, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Meta não encontrada")
        contributions = self.repository.list_contributions(user_id, goal_id)
        return [self._serialize_contribution(row) for row in contributions]

    def delete_goal_contribution(self, user_id: int, goal_id: int, contribution_id: int) -> dict:
        contribution = self.repository.get_contribution(user_id, goal_id, contribution_id)
        if not contribution:
            raise HTTPException(status_code=404, detail="Contribuição não encontrada")
        self.repository.delete_contribution(user_id, goal_id, contribution_id)
        self.repository.recompute_goal_balance(user_id, goal_id)
        return {"status": "success", "message": "Contribuição removida"}

    @staticmethod
    def _serialize_contribution(row: dict) -> dict:
        return {
            "id": row["id"],
            "goal_id": row["goal_id"],
            "type": row["type"],
            "amount": round(float(row["amount"]), 2),
            "source": row["source"],
            "date": row["date"],
            "transaction_id": row.get("transaction_id"),
        }

    # --- Planejador de metas (seções 7, 8 e 9 do pedido) ---
    #
    # Tudo aqui é aritmética simples e documentada — nada de "IA" ou
    # projeção estatística sofisticada (ver docs/GUIA-COFRINHO.md pra a
    # explicação completa de cada fórmula).

    @staticmethod
    def _months_between(start: date, end: date) -> int:
        """Diferença em meses de calendário (não em dias/30) entre duas
        datas — sempre >= 0. Ex.: 15/jan -> 03/mar = 2, mesmo a diferença
        exata em dias sendo menor que 60."""
        return max(0, (end.year - start.year) * 12 + (end.month - start.month))

    @staticmethod
    def _parse_date_only(value: Optional[str]) -> Optional[date]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                return None

    def _compute_goal_planning(
        self,
        target: float,
        current: float,
        deadline_raw: Optional[str],
        contributions: List[dict],
        today: date,
    ) -> dict:
        missing = max(0.0, target - current)

        # "Quanto preciso guardar por mês até o prazo?" (seção 8) — só
        # faz sentido com prazo definido, no futuro, e com valor faltando.
        deadline_passed = False
        monthly_target = None
        deadline_date = self._parse_date_only(deadline_raw)
        if deadline_date:
            if deadline_date < today:
                deadline_passed = True
            elif missing > 0:
                months_remaining = max(1, self._months_between(today, deadline_date))
                monthly_target = round(missing / months_remaining, 2)

        # "Nesse ritmo, quando eu chego lá?" (seção 9) — média mensal
        # real de contribuição (depósitos - retiradas) desde a primeira
        # contribuição até hoje, dividida pelos meses decorridos nesse
        # intervalo (inclusive). Exige pelo menos 2 contribuições pra
        # considerar que há "ritmo" o bastante pra estimar (uma única
        # contribuição não é um ritmo, é um ponto isolado).
        avg_monthly_contribution = None
        estimated_months = None
        has_enough_history = len(contributions) >= 2
        if has_enough_history and missing > 0:
            contribution_dates = [
                d for d in (self._parse_date_only(c["date"]) for c in contributions) if d is not None
            ]
            if contribution_dates:
                first_date = min(contribution_dates)
                elapsed_months = max(1, self._months_between(first_date, today) + 1)
                net_total = sum(
                    -float(c["amount"]) if c["type"] == "withdrawal" else float(c["amount"])
                    for c in contributions
                )
                if net_total > 0:
                    avg_monthly_contribution = round(net_total / elapsed_months, 2)
                    estimated_months = max(1, ceil(missing / avg_monthly_contribution))

        return {
            "deadline_passed": deadline_passed,
            "monthly_target": monthly_target,
            "avg_monthly_contribution": avg_monthly_contribution,
            "estimated_months": estimated_months,
            "has_enough_history": has_enough_history,
        }

    # --- Dashboard ---

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
