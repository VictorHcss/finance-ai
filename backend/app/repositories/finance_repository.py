import json
from datetime import datetime, timezone
from typing import List, Optional

from app.core.database import get_connection
from app.core.dedupe import compute_dedupe_hash, normalize_description


class FinanceRepository:
    def create_transaction(self, user_id: int, payload: dict) -> None:
        now = datetime.now(timezone.utc).isoformat()
        normalized = normalize_description(payload["description"])
        dedupe_hash = compute_dedupe_hash(payload["date"], normalized, payload["amount"], payload["type"])
        with get_connection() as conn:
            conn.execute(
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
