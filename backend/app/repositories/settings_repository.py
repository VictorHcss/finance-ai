from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_connection


class SettingsRepository:
    def get_settings(self, user_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM settings WHERE user_id = ?",
                (user_id,),
            ).fetchone()
        return dict(row) if row else None

    def ensure_settings(self, user_id: int) -> dict:
        """Garante que exista uma linha de configurações para o usuário
        (criada com os valores padrão da tabela na primeira vez que ele
        acessa Configurações)."""
        existing = self.get_settings(user_id)
        if existing:
            return existing

        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO settings (user_id, created_at, updated_at)
                VALUES (?, ?, ?)
                """,
                (user_id, now, now),
            )
            conn.commit()
        return self.get_settings(user_id)

    def update_settings(self, user_id: int, payload: dict) -> dict:
        self.ensure_settings(user_id)
        now = datetime.now(timezone.utc).isoformat()

        fields = []
        values = []
        for key in ("notifications_enabled", "ai_enabled", "theme", "currency", "locale"):
            if key in payload and payload[key] is not None:
                fields.append(f"{key} = ?")
                value = payload[key]
                if isinstance(value, bool):
                    value = int(value)
                values.append(value)

        if fields:
            fields.append("updated_at = ?")
            values.append(now)
            values.append(user_id)
            with get_connection() as conn:
                conn.execute(
                    f"UPDATE settings SET {', '.join(fields)} WHERE user_id = ?",
                    tuple(values),
                )
                conn.commit()

        return self.get_settings(user_id)
