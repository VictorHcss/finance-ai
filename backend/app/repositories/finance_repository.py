import json
from datetime import datetime, timezone
from typing import List, Optional

from app.core.database import get_connection


class FinanceRepository:
    def create_transaction(self, user_id: int, payload: dict) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO transactions (
                    user_id, description, amount, type, category, date, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["description"],
                    payload["amount"],
                    payload["type"],
                    payload["category"],
                    payload["date"],
                    now,
                    now,
                ),
            )
            conn.commit()

    def list_transactions(self, user_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, description, amount, type, category, date
                FROM transactions
                WHERE user_id = ?
                ORDER BY date DESC, id DESC
                """,
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

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

    def complete_goal(self, user_id: int, goal_id: int) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE goals
                SET completed = 1, current_amount = target_amount, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (now, goal_id, user_id),
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
