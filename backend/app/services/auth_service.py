from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from app.core.security import (
    build_jwt_payload,
    encode_jwt_placeholder,
    generate_session_token,
    hash_password,
    sanitize_text,
    verify_password,
)
from app.repositories.auth_repository import AuthRepository


class AuthService:
    def __init__(self) -> None:
        self.repository = AuthRepository()

    def register(self, name: str, email: str, password: str) -> dict:
        normalized_name = sanitize_text(name)
        normalized_email = sanitize_text(email).lower()

        if self.repository.get_user_by_email(normalized_email):
            raise HTTPException(status_code=409, detail="E-mail já cadastrado")

        user = self.repository.create_user(
            normalized_name,
            normalized_email,
            hash_password(password),
        )
        return self._create_auth_response(user)

    def login(self, email: str, password: str) -> dict:
        normalized_email = sanitize_text(email).lower()
        user = self.repository.get_user_by_email(normalized_email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

        self.repository.update_last_login(user["id"])
        refreshed_user = self.repository.get_user_by_id(user["id"])
        return self._create_auth_response(refreshed_user)

    def logout(self, token: str) -> dict:
        self.repository.delete_session(token)
        return {"status": "success", "message": "Sessão encerrada"}

    def forgot_password(self, email: str) -> dict:
        normalized_email = sanitize_text(email).lower()
        user_exists = self.repository.get_user_by_email(normalized_email) is not None
        return {
            "status": "success",
            "message": (
                "Fluxo de recuperação preparado. "
                "Implemente o provedor de e-mail para concluir o reset."
            ),
            "email_sent": user_exists,
        }

    def get_profile(self, user_id: int) -> dict:
        user = self.repository.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return user

    def _create_auth_response(self, user: dict) -> dict:
        session_token = generate_session_token()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        self.repository.create_session(user["id"], session_token, expires_at)
        jwt_payload = encode_jwt_placeholder(build_jwt_payload(str(user["id"])))
        return {
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "avatar": user.get("avatar"),
                "created_at": user["created_at"],
                "updated_at": user["updated_at"],
                "last_login": user.get("last_login"),
            },
            "session_token": session_token,
            "expires_at": expires_at,
            "jwt_payload": jwt_payload,
        }
