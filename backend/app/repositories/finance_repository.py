import json
from datetime import datetime, timezone
from typing import List, Optional

from app.core.database import get_connection
from app.core.dedupe import compute_dedupe_hash, normalize_description


class FinanceRepository:
    def create_transaction(self, user_id: int, payload: dict) -> int:
        now = datetime.now(timezone.utc).isoformat()
        normalized = normalize_description(payload["description"])
        dedupe_hash = compute_dedupe_hash(payload["date"], normalized, payload["amount"], payload["type"])
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO transactions (
                    user_id, description, amount, type, category, date,
                    source, dedupe_hash, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?)
                """,
                (
                    user_id,
                    payload["description"],
                    payload["amount"],
                    payload["type"],
                    payload["category"],
                    payload["date"],
                    dedupe_hash,
                    now,
                    now,
                ),
            )
            conn.commit()
            return cursor.lastrowid

    def get_transaction(self, user_id: int, transaction_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
                (transaction_id, user_id),
            ).fetchone()
        return dict(row) if row else None

    def list_transactions(self, user_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, description, amount, type, category, date, source
                FROM transactions
                WHERE user_id = ?
                ORDER BY date DESC, id DESC
                """,
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def bulk_create_imported_transactions(self, user_id: int, rows: List[dict], import_batch_id: int) -> int:
        """Persiste, de uma só vez, as linhas de uma prévia de
        importação já confirmadas pelo usuário. `executemany` evita
        uma query por transação em extratos grandes."""
        now = datetime.now(timezone.utc).isoformat()
        values = [
            (
                user_id,
                row["description"],
                row["amount"],
                row["type"],
                row["category"],
                row["date"],
                "import",
                row.get("external_id"),
                row["dedupe_hash"],
                import_batch_id,
                row.get("original_description", row["description"]),
                now,
                now,
            )
            for row in rows
        ]
        with get_connection() as conn:
            conn.executemany(
                """
                INSERT INTO transactions (
                    user_id, description, amount, type, category, date,
                    source, external_id, dedupe_hash, import_batch_id,
                    original_description, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                values,
            )
            conn.commit()
        return len(values)

    def get_existing_external_ids(self, user_id: int) -> set:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT external_id FROM transactions WHERE user_id = ? AND external_id IS NOT NULL",
                (user_id,),
            ).fetchall()
        return {row["external_id"] for row in rows}

    def get_existing_dedupe_hashes(self, user_id: int) -> set:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT dedupe_hash FROM transactions WHERE user_id = ? AND dedupe_hash IS NOT NULL",
                (user_id,),
            ).fetchall()
        return {row["dedupe_hash"] for row in rows}

    def update_transaction(self, user_id: int, transaction_id: int, payload: dict) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE transactions
                SET description = ?, amount = ?, type = ?, category = ?, date = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (
                    payload["description"],
                    payload["amount"],
                    payload["type"],
                    payload["category"],
                    payload["date"],
                    now,
                    transaction_id,
                    user_id,
                ),
            )
            conn.commit()
        return cursor.rowcount

    def delete_transaction(self, user_id: int, transaction_id: int) -> int:
        with get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM transactions WHERE id = ? AND user_id = ?",
                (transaction_id, user_id),
            )
            conn.commit()
        return cursor.rowcount

    def create_goal(self, user_id: int, payload: dict) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO goals (
                    user_id, name, target_amount, current_amount, deadline,
                    completed, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                """,
                (
                    user_id,
                    payload["name"],
                    payload["target_amount"],
                    payload["current_amount"],
                    payload.get("deadline"),
                    now,
                    now,
                ),
            )
            conn.commit()

    def list_goals(self, user_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM goals
                WHERE user_id = ?
                ORDER BY completed ASC, id DESC
                """,
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_goal(self, user_id: int, goal_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM goals WHERE id = ? AND user_id = ?",
                (goal_id, user_id),
            ).fetchone()
        return dict(row) if row else None

    def update_goal_progress(self, user_id: int, goal_id: int, current_amount: float, completed: bool) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE goals
                SET current_amount = ?, completed = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (current_amount, int(completed), now, goal_id, user_id),
            )
            conn.commit()
        return cursor.rowcount

    def update_goal(
        self,
        user_id: int,
        goal_id: int,
        name: str,
        target_amount: float,
        deadline: Optional[str],
        completed: bool,
    ) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE goals
                SET name = ?, target_amount = ?, deadline = ?, completed = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (name, target_amount, deadline, int(completed), now, goal_id, user_id),
            )
            conn.commit()
        return cursor.rowcount

    def delete_goal(self, user_id: int, goal_id: int) -> int:
        with get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM goals WHERE id = ? AND user_id = ?",
                (goal_id, user_id),
            )
            conn.commit()
        return cursor.rowcount

    # --- Cofrinho da meta (contribuições) ---

    def create_contribution(
        self,
        user_id: int,
        goal_id: int,
        contribution_type: str,
        amount: float,
        source: str,
        date: str,
        transaction_id: Optional[int] = None,
    ) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO goal_contributions (
                    user_id, goal_id, transaction_id, type, amount, source, date, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, goal_id, transaction_id, contribution_type, amount, source, date, now),
            )
            conn.commit()
            return cursor.lastrowid

    def list_contributions(self, user_id: int, goal_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM goal_contributions
                WHERE user_id = ? AND goal_id = ?
                ORDER BY date DESC, id DESC
                """,
                (user_id, goal_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_all_contributions(self, user_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM goal_contributions WHERE user_id = ? ORDER BY date DESC, id DESC",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_contributions_by_transaction(self, user_id: int, transaction_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM goal_contributions WHERE user_id = ? AND transaction_id = ?",
                (user_id, transaction_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def sync_contribution_dates_for_transaction(self, user_id: int, transaction_id: int, new_date: str) -> None:
        with get_connection() as conn:
            conn.execute(
                "UPDATE goal_contributions SET date = ? WHERE user_id = ? AND transaction_id = ?",
                (new_date, user_id, transaction_id),
            )
            conn.commit()

    def get_contribution(self, user_id: int, goal_id: int, contribution_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM goal_contributions WHERE id = ? AND user_id = ? AND goal_id = ?",
                (contribution_id, user_id, goal_id),
            ).fetchone()
        return dict(row) if row else None

    def delete_contribution(self, user_id: int, goal_id: int, contribution_id: int) -> int:
        with get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM goal_contributions WHERE id = ? AND user_id = ? AND goal_id = ?",
                (contribution_id, user_id, goal_id),
            )
            conn.commit()
        return cursor.rowcount

    def get_goal_balance(self, user_id: int, goal_id: int) -> float:
        """Soma das contribuições (depósitos - retiradas) — a fonte da
        verdade do saldo da meta. `current_amount` em `goals` é uma
        cópia sempre recalculada a partir daqui (ver
        `recompute_goal_balance`), nunca editada diretamente."""
        with get_connection() as conn:
            row = conn.execute(
                """
                SELECT COALESCE(SUM(
                    CASE WHEN type = 'withdrawal' THEN -amount ELSE amount END
                ), 0) AS balance
                FROM goal_contributions
                WHERE user_id = ? AND goal_id = ?
                """,
                (user_id, goal_id),
            ).fetchone()
        return float(row["balance"])

    def recompute_goal_balance(self, user_id: int, goal_id: int) -> Optional[dict]:
        """Recalcula current_amount/completed da meta a partir da soma
        real das contribuições, e persiste. Chamado depois de qualquer
        escrita que mude o "cofrinho" (nova contribuição, exclusão de
        contribuição, exclusão de transação vinculada) — nunca faz um
        incremento/decremento direto, sempre recalcula do zero, o que
        evita o saldo divergir da soma real por causa de alguma edição
        ou exclusão em outro lugar."""
        goal = self.get_goal(user_id, goal_id)
        if not goal:
            return None
        balance = max(0.0, self.get_goal_balance(user_id, goal_id))
        completed = balance >= float(goal["target_amount"])
        self.update_goal_progress(user_id, goal_id, balance, completed)
        return self.get_goal(user_id, goal_id)

    def replace_insights(self, user_id: int, insights: List[dict]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute("DELETE FROM ai_insights WHERE user_id = ?", (user_id,))
            conn.executemany(
                """
                INSERT INTO ai_insights (
                    user_id, insight_type, title, message, severity, metadata, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        user_id,
                        insight["type"],
                        insight["title"],
                        insight["message"],
                        insight["severity"],
                        json.dumps(
                            {
                                "metric_label": insight.get("metric_label"),
                                "metric_value": insight.get("metric_value"),
                            }
                        ),
                        now,
                    )
                    for insight in insights
                ],
            )
            conn.commit()
