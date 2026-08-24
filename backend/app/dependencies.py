from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.core.rbac import Role
from app.repositories.auth_repository import AuthRepository


def get_current_user_id(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> int:
    """Identifica o usuário autenticado a partir do token de sessão.

    Antes, quando o token não vinha ou era inválido, esta função caía
    num fallback que confiava no cabeçalho `X-User-Id` (enviado pelo
    próprio cliente) ou, na ausência dele, assumia `user_id = 1`.
    Isso permitia que qualquer requisição sem nenhuma credencial real
    acessasse dados de qualquer usuário só forjando um cabeçalho.
    Agora, sem uma sessão válida, a resposta é sempre 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")

    token = authorization.replace("Bearer ", "", 1).strip()
    repository = AuthRepository()
    session = repository.get_session(token)

    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    expires_at = datetime.fromisoformat(session["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    user_id = int(session["user_id"])
    if not repository.get_user_by_id(user_id):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

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
