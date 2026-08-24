from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.core.security import sanitize_text


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name", "email")
    @classmethod
    def sanitize_string(cls, value: str) -> str:
        return sanitize_text(value)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return sanitize_text(value).lower()


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=120)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return sanitize_text(value).lower()


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    email: Optional[str] = Field(default=None, min_length=5, max_length=120)


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str] = None
    created_at: datetime | str
    updated_at: datetime | str
    last_login: Optional[datetime | str] = None


class AuthResponse(BaseModel):
    user: UserProfileResponse
    session_token: str
    expires_at: str
    jwt_payload: str
