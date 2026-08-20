import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional


def sanitize_text(value: str) -> str:
    return " ".join(value.strip().split())


def hash_password(password: str, *, salt: Optional[str] = None) -> str:
    raw_salt = salt or secrets.token_hex(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        raw_salt.encode("utf-8"),
        100_000,
    )
    return f"{raw_salt}${derived_key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, stored_hash = password_hash.split("$", maxsplit=1)
    except ValueError:
        return False

    candidate_hash = hash_password(password, salt=salt).split("$", maxsplit=1)[1]
    return hmac.compare_digest(candidate_hash, stored_hash)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def build_jwt_payload(subject: str, expires_in_minutes: int = 60) -> Dict[str, str]:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    return {
        "sub": subject,
        "exp": expires_at.isoformat(),
        "scope": "finance-ai:access",
    }


def encode_jwt_placeholder(payload: Dict[str, str]) -> str:
    """Prepara a assinatura JWT futura sem depender de libs externas."""
    return base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("utf-8")
