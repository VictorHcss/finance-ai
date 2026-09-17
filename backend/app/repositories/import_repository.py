from datetime import datetime, timezone
from typing import List, Optional

from app.core.database import get_connection


class ImportRepository:
    # ------------------------------------------------------------------
    # import_batches
    # ------------------------------------------------------------------

    def create_batch(self, user_id: int, filename: str, source: str) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO import_batches (user_id, filename, source, status, created_at)
                VALUES (?, ?, ?, 'processing', ?)
                """,
                (user_id, filename, source, now),
            )
            conn.commit()
            return cursor.lastrowid

    def update_batch_summary(
        self,
        batch_id: int,
        *,
        status: str,
        total: int,
        new_count: int,
        duplicated_count: int,
        error_count: int,
        error_message: Optional[str] = None,
    ) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE import_batches
                SET status = ?, total = ?, new_count = ?, duplicated_count = ?,
                    error_count = ?, error_message = ?
                WHERE id = ?
                """,
                (status, total, new_count, duplicated_count, error_count, error_message, batch_id),
            )
            conn.commit()

    def mark_batch_confirmed(self, batch_id: int, imported_count: int) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE import_batches
                SET status = 'completed', imported_count = ?, completed_at = ?
                WHERE id = ?
                """,
                (imported_count, now, batch_id),
            )
            conn.commit()

    def get_batch(self, user_id: int, batch_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM import_batches WHERE id = ? AND user_id = ?",
                (batch_id, user_id),
            ).fetchone()
        return dict(row) if row else None

    def list_batches(self, user_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM import_batches
                WHERE user_id = ?
                ORDER BY created_at DESC, id DESC
                """,
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    # ------------------------------------------------------------------
    # import_staged_rows
    # ------------------------------------------------------------------

    def insert_staged_rows(self, batch_id: int, user_id: int, rows: List[dict]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        values = [
            (
                batch_id,
                user_id,
                row.get("date"),
                row["original_description"],
                row.get("normalized_description"),
                row.get("amount"),
                row.get("type"),
                row.get("category"),
                row.get("category_source", "none"),
                row["status"],
                row.get("error_reason"),
                row.get("external_id"),
                row.get("dedupe_hash"),
                now,
            )
            for row in rows
        ]
        if not values:
            return
        with get_connection() as conn:
            conn.executemany(
                """
                INSERT INTO import_staged_rows (
                    batch_id, user_id, date, original_description, normalized_description,
                    amount, type, category, category_source, status, error_reason,
                    external_id, dedupe_hash, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                values,
            )
            conn.commit()

    def list_staged_rows(self, user_id: int, batch_id: int) -> List[dict]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM import_staged_rows
                WHERE batch_id = ? AND user_id = ?
                ORDER BY id ASC
                """,
                (batch_id, user_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_staged_rows_by_ids(self, user_id: int, batch_id: int, staged_ids: List[int]) -> List[dict]:
        if not staged_ids:
            return []
        placeholders = ",".join("?" for _ in staged_ids)
        with get_connection() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM import_staged_rows
                WHERE batch_id = ? AND user_id = ? AND id IN ({placeholders})
                """,
                (batch_id, user_id, *staged_ids),
            ).fetchall()
        return [dict(row) for row in rows]

    def mark_rows_imported(self, row_ids: List[int]) -> None:
        if not row_ids:
            return
        placeholders = ",".join("?" for _ in row_ids)
        with get_connection() as conn:
            conn.execute(
                f"UPDATE import_staged_rows SET status = 'imported' WHERE id IN ({placeholders})",
                tuple(row_ids),
            )
            conn.commit()
