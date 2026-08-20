from fastapi import APIRouter, Depends, Header

from app.dependencies import get_current_user_id
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    UserProfileResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(prefix="/api/auth", tags=["auth"])
service = AuthService()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> dict:
    return service.register(payload.name, payload.email, payload.password)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> dict:
    return service.login(payload.email, payload.password)


@router.post("/logout")
def logout(authorization: str | None = Header(default=None, alias="Authorization")) -> dict:
    token = authorization.replace("Bearer ", "") if authorization else ""
    return service.logout(token)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict:
    return service.forgot_password(payload.email)


@router.get("/profile", response_model=UserProfileResponse)
def profile(user_id: int = Depends(get_current_user_id)) -> dict:
    return service.get_profile(user_id)
