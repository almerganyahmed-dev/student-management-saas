import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum

import bcrypt
import jwt

from app.core.config import settings


class TokenType(str, Enum):
    access = "access"
    refresh = "refresh"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def _create_token(user_id: uuid.UUID, tenant_id: uuid.UUID, role: str, token_type: TokenType, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: uuid.UUID, tenant_id: uuid.UUID, role: str) -> str:
    return _create_token(
        user_id, tenant_id, role, TokenType.access, timedelta(minutes=settings.access_token_expire_minutes)
    )


def create_refresh_token(user_id: uuid.UUID, tenant_id: uuid.UUID, role: str) -> str:
    return _create_token(
        user_id, tenant_id, role, TokenType.refresh, timedelta(days=settings.refresh_token_expire_days)
    )


def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError (expired, invalid signature, malformed) on failure — caller maps to 401."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
