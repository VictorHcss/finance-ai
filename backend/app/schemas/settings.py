from typing import Optional

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    user_id: int
    currency: str
    locale: str
    theme: str
    notifications_enabled: bool
    ai_enabled: bool
    updated_at: str

    @classmethod
    def from_row(cls, row: dict) -> "SettingsResponse":
        return cls(
            user_id=row["user_id"],
            currency=row["currency"],
            locale=row["locale"],
            theme=row["theme"],
            notifications_enabled=bool(row["notifications_enabled"]),
            ai_enabled=bool(row["ai_enabled"]),
            updated_at=row["updated_at"],
        )


class SettingsUpdateRequest(BaseModel):
    notifications_enabled: Optional[bool] = None
    ai_enabled: Optional[bool] = None
    theme: Optional[str] = None
    currency: Optional[str] = None
    locale: Optional[str] = None
