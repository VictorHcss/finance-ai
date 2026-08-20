from typing import Any, Optional

from app.core.events import register_event_handler
from app.repositories.audit_repository import AuditRepository


class AuditService:
    def __init__(self) -> None:
        self.repository = AuditRepository()

    def log(
        self,
        user_id: int,
        action: str,
        entity: Optional[str] = None,
        entity_id: Optional[str] = None,
        payload: Optional[dict[str, Any]] = None,
    ) -> None:
        self.repository.create_log(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            payload=payload,
        )


def register_audit_event_handler() -> None:
    service = AuditService()

    def handler(name: str, payload: dict[str, Any]) -> None:
        user_id = payload.get("user_id")
        if not isinstance(user_id, int):
            return
        entity = payload.get("entity") if isinstance(payload.get("entity"), str) else None
        entity_id = (
            payload.get("entity_id") if isinstance(payload.get("entity_id"), str) else None
        )
        details = payload.get("payload") if isinstance(payload.get("payload"), dict) else None
        service.log(
            user_id=user_id,
            action=name,
            entity=entity,
            entity_id=entity_id,
            payload=details,
        )

    register_event_handler(handler)
