from app.repositories.settings_repository import SettingsRepository


class SettingsService:
    def __init__(self) -> None:
        self.repository = SettingsRepository()

    def get_settings(self, user_id: int) -> dict:
        return self.repository.ensure_settings(user_id)

    def update_settings(self, user_id: int, payload: dict) -> dict:
        return self.repository.update_settings(user_id, payload)
