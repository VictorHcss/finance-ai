import json
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.database import get_connection


class AuditRepository:
    def create_log(
        self,
        user_id: int,
        action: str,
        entity: Optional[str],
        entity_id: Optional[str],
        payload: Optional[dict[str, Any]],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity, entity_id, payload, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    action,
                    entity,
                    entity_id,
                    json.dumps(payload) if payload is not None else None,
                    now,
                ),
            )
            conn.commit()
