from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_connection


class AuthRepository:
    def get_user_by_id(self, user_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        return dict(row) if row else None

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE lower(email) = lower(?)",
                (email,),
            ).fetchone()
        return dict(row) if row else None

    def create_user(self, name: str, email: str, password_hash: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (name, email, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email, password_hash, now, now),
            )
            user_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO settings (
                    user_id, currency, locale, theme,
                    notifications_enabled, ai_enabled, created_at, updated_at
                )
                VALUES (?, 'BRL', 'pt-BR', 'dark', 1, 1, ?, ?)
                """,
                (user_id, now, now),
            )
            conn.commit()
        return self.get_user_by_id(int(user_id))

    def update_last_login(self, user_id: int) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET last_login = ?, updated_at = ?
                WHERE id = ?
                """,
                (now, now, user_id),
            )
            conn.commit()

    def create_session(self, user_id: int, token: str, expires_at: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sessions (user_id, token, expires_at, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, token, expires_at, now),
            )
            conn.commit()

    def get_session(self, token: str) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM sessions WHERE token = ?",
                (token,),
            ).fetchone()
        return dict(row) if row else None

    def delete_session(self, token: str) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
