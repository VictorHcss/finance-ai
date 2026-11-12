from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core import rate_limit
from app.core.security import sanitize_text
from app.dependencies import get_current_user_id
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserProfileResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(prefix="/api/auth", tags=["auth"])
service = AuthService()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> dict:
    return service.register(payload.name, payload.email, payload.password)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request) -> dict:
    ip = request.client.host if request.client else "unknown"
    email = sanitize_text(payload.email).lower()

    wait = rate_limit.retry_after_seconds(ip, email)
    if wait:
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de login. Tente novamente em alguns minutos.",
            headers={"Retry-After": str(wait)},
        )

    try:
        result = service.login(payload.email, payload.password)
    except HTTPException as exc:
        if exc.status_code == 401:
            rate_limit.register_failure(ip, email)
        raise
    rate_limit.register_success(ip, email)
    return result


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


@router.put("/profile", response_model=UserProfileResponse)
def update_profile(
    payload: UpdateProfileRequest,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    return service.update_profile(user_id, payload.name, payload.email)


@router.delete("/account")
def delete_account(user_id: int = Depends(get_current_user_id)) -> dict:
    return service.delete_account(user_id)
