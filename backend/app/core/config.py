import os
from typing import List
from urllib.parse import urlparse


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "finance.db")

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")


def get_allowed_origins() -> List[str]:
    raw_value = os.getenv("ALLOWED_ORIGINS", "")
    if not raw_value.strip():
        return DEFAULT_ALLOWED_ORIGINS

    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


DEV_SECRET_KEY = "dev-secret-key-change-in-production"


def get_secret_key() -> str:
    return os.getenv("SECRET_KEY", DEV_SECRET_KEY)


def validate_production_config() -> None:
    """Impede subir fora de desenvolvimento com a chave padrão (pública no código)."""
    if get_environment() == "development":
        return
    secret = os.getenv("SECRET_KEY", "")
    if not secret or secret == DEV_SECRET_KEY or len(secret) < 32:
        raise RuntimeError(
            "SECRET_KEY ausente, padrão ou curta demais (mínimo 32 caracteres). "
            "Defina uma chave forte antes de rodar com ENVIRONMENT="
            f"{get_environment()!r}."
        )


def get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET", get_secret_key())


def get_access_token_expire_minutes() -> int:
    return int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def get_environment() -> str:
    return os.getenv("ENVIRONMENT", "development")
