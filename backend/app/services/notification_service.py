from typing import Optional

from fastapi import HTTPException

from app.core.events import emit_event
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notifications import NotificationStatus


class NotificationService:
    def __init__(self) -> None:
        self.repository = NotificationRepository()

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
    ) -> tuple[list[dict], int]:
        if page < 1:
            raise HTTPException(status_code=422, detail="Página inválida")
        if page_size < 1 or page_size > 200:
            raise HTTPException(status_code=422, detail="Tamanho de página inválido")

        return self.repository.list_notifications(
            user_id,
            q=q,
            category=category,
            priority=priority,
            status=status,
            start=start,
            end=end,
            page=page,
            page_size=page_size,
        )

    def mark_as_read(self, user_id: int, notification_id: int) -> None:
        updated = self.repository.mark_notification_as_read(user_id, notification_id)
        if updated == 0:
            raise HTTPException(status_code=404, detail="Notificação não encontrada")

        emit_event(
            "notification_read",
            {
                "user_id": user_id,
                "entity": "notification",
                "entity_id": str(notification_id),
                "payload": {"id": notification_id},
            },
        )

    def mark_all_as_read(
        self,
        user_id: int,
        *,
        q: Optional[str],
        category: Optional[str],
        priority: Optional[str],
        start: Optional[str],
        end: Optional[str],
    ) -> int:
        updated = self.repository.mark_all_notifications_as_read(
            user_id,
            q=q,
            category=category,
            priority=priority,
            start=start,
            end=end,
        )

        emit_event(
            "notifications_read_all",
            {
                "user_id": user_id,
                "entity": "notifications",
                "entity_id": None,
                "payload": {
                    "q": q,
                    "category": category,
                    "priority": priority,
                    "from": start,
                    "to": end,
                    "updated": updated,
                },
            },
        )

        return updated

    @staticmethod
    def compute_status(read_at: Optional[str]) -> NotificationStatus:
        return NotificationStatus.read if read_at else NotificationStatus.unread
