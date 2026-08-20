import json
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.database import get_connection


class NotificationRepository:
    def list_notifications(
        self,
        user_id: int,
        *,
        q: Optional[str],
        category: Optional[str],
        priority: Optional[str],
        status: Optional[str],
        start: Optional[str],
        end: Optional[str],
        page: int,
        page_size: int,
    ) -> tuple[list[dict[str, Any]], int]:
        where: list[str] = ["user_id = ?", "deleted_at IS NULL"]
        params: list[Any] = [user_id]

        if category:
            where.append("category = ?")
            params.append(category)

        if priority:
            where.append("priority = ?")
            params.append(priority)

        if status == "unread":
            where.append("read_at IS NULL")
        elif status == "read":
            where.append("read_at IS NOT NULL")

        if start:
            where.append("created_at >= ?")
            params.append(start)

        if end:
            where.append("created_at <= ?")
            params.append(end)

        if q:
            where.append("(title LIKE ? OR description LIKE ?)")
            like = f"%{q}%"
            params.extend([like, like])

        where_sql = " AND ".join(where)

        offset = (page - 1) * page_size

        with get_connection() as conn:
            total_row = conn.execute(
                f"SELECT COUNT(1) AS total FROM notifications WHERE {where_sql}",
                tuple(params),
            ).fetchone()
            total = int(total_row["total"]) if total_row else 0

            rows = conn.execute(
                f"""
                SELECT id, title, description, category, priority,
                       action_url, metadata, read_at, created_at
                FROM notifications
                WHERE {where_sql}
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?
                """,
                tuple([*params, page_size, offset]),
            ).fetchall()

        items: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            raw_meta = item.get("metadata")
            if isinstance(raw_meta, str) and raw_meta:
                try:
                    item["metadata"] = json.loads(raw_meta)
                except json.JSONDecodeError:
                    item["metadata"] = None
            else:
                item["metadata"] = None
            items.append(item)

        return items, total

    def mark_notification_as_read(self, user_id: int, notification_id: int) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE notifications
                SET read_at = COALESCE(read_at, ?),
                    updated_at = ?
                WHERE id = ? AND user_id = ? AND deleted_at IS NULL
                """,
                (now, now, notification_id, user_id),
            )
            conn.commit()
        return cursor.rowcount

    def mark_all_notifications_as_read(
        self,
        user_id: int,
        *,
        q: Optional[str],
        category: Optional[str],
        priority: Optional[str],
        start: Optional[str],
        end: Optional[str],
    ) -> int:
        where: list[str] = [
            "user_id = ?",
            "deleted_at IS NULL",
            "read_at IS NULL",
        ]
        params: list[Any] = [user_id]

        if category:
            where.append("category = ?")
            params.append(category)

        if priority:
            where.append("priority = ?")
            params.append(priority)

        if start:
            where.append("created_at >= ?")
            params.append(start)

        if end:
            where.append("created_at <= ?")
            params.append(end)

        if q:
            where.append("(title LIKE ? OR description LIKE ?)")
            like = f"%{q}%"
            params.extend([like, like])

        where_sql = " AND ".join(where)
        now = datetime.now(timezone.utc).isoformat()

        with get_connection() as conn:
            cursor = conn.execute(
                f"""
                UPDATE notifications
                SET read_at = COALESCE(read_at, ?),
                    updated_at = ?
                WHERE {where_sql}
                """,
                tuple([now, now, *params]),
            )
            conn.commit()
        return cursor.rowcount
