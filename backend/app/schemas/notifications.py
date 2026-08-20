from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class NotificationCategory(str, Enum):
    financeiro = "financeiro"
    sistema = "sistema"
    ia = "ia"
    seguranca = "seguranca"
    atualizacoes = "atualizacoes"
    lembretes = "lembretes"


class NotificationPriority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class NotificationStatus(str, Enum):
    unread = "unread"
    read = "read"


class NotificationResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: NotificationCategory
    priority: NotificationPriority
    status: NotificationStatus
    created_at: str
    read_at: Optional[str] = None
    action_url: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class ListNotificationsResponse(BaseModel):
    items: list[NotificationResponse]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=200)
    total: int = Field(ge=0)


class MarkNotificationReadResponse(BaseModel):
    ok: bool = True


class MarkAllNotificationsReadResponse(BaseModel):
    ok: bool = True
