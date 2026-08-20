from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.core.rbac import Role
from app.repositories.auth_repository import AuthRepository


def get_current_user_id(
    x_user_id: Optional[int] = Header(default=None, alias="X-User-Id"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> int:
    repository = AuthRepository()

    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
        session = repository.get_session(token)
        if session:
            expires_at = datetime.fromisoformat(session["expires_at"])
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                return int(session["user_id"])

    user_id = x_user_id or 1
    if not repository.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user_id


def get_current_user_role(
    user_id: int = Depends(get_current_user_id),
) -> Role:
    repository = AuthRepository()
    user = repository.get_user_by_id(int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    role = user.get("role") or "user"
    try:
        return Role(role)
    except ValueError:
        return Role.user


def require_roles(*allowed: Role):
    def dependency(role: Role = Depends(get_current_user_role)) -> Role:
        if role in allowed:
            return role
        raise HTTPException(status_code=403, detail="Acesso negado")

    return dependency
