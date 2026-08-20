from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user_id
from app.schemas.notifications import (
    ListNotificationsResponse,
    MarkAllNotificationsReadResponse,
    MarkNotificationReadResponse,
    NotificationCategory,
    NotificationPriority,
    NotificationResponse,
    NotificationStatus,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
service = NotificationService()


@router.get("", response_model=ListNotificationsResponse)
def list_notifications(
    q: Optional[str] = Query(default=None),
    category: Optional[NotificationCategory] = Query(default=None),
    priority: Optional[NotificationPriority] = Query(default=None),
    status: Optional[NotificationStatus] = Query(default=None),
    start: Optional[str] = Query(default=None, alias="from"),
    end: Optional[str] = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    user_id: int = Depends(get_current_user_id),
):
    items, total = service.list_notifications(
        user_id,
        q=q,
        category=category.value if category else None,
        priority=priority.value if priority else None,
        status=status.value if status else None,
        start=start,
        end=end,
        page=page,
        page_size=page_size,
    )

    response_items = [
        NotificationResponse(
            id=item["id"],
            title=item["title"],
            description=item.get("description"),
            category=item["category"],
            priority=item["priority"],
            status=service.compute_status(item.get("read_at")),
            created_at=item["created_at"],
            read_at=item.get("read_at"),
            action_url=item.get("action_url"),
            metadata=item.get("metadata"),
        )
        for item in items
    ]

    return ListNotificationsResponse(
        items=response_items, page=page, page_size=page_size, total=total
    )


@router.post("/{notification_id}/read", response_model=MarkNotificationReadResponse)
def mark_notification_as_read(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
):
    service.mark_as_read(user_id, notification_id)
    return MarkNotificationReadResponse(ok=True)


@router.post("/read-all", response_model=MarkAllNotificationsReadResponse)
def mark_all_notifications_as_read(
    q: Optional[str] = Query(default=None),
    category: Optional[NotificationCategory] = Query(default=None),
    priority: Optional[NotificationPriority] = Query(default=None),
    start: Optional[str] = Query(default=None, alias="from"),
    end: Optional[str] = Query(default=None, alias="to"),
    user_id: int = Depends(get_current_user_id),
):
    service.mark_all_as_read(
        user_id,
        q=q,
        category=category.value if category else None,
        priority=priority.value if priority else None,
        start=start,
        end=end,
    )
    return MarkAllNotificationsReadResponse(ok=True)
