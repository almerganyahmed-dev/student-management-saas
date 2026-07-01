import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import TokenType, decode_token
from app.db.session import get_db
from app.models.models import User, UserRole

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise credentials_error

    if payload.get("type") != TokenType.access.value:
        raise credentials_error

    try:
        user_id = uuid.UUID(payload["sub"])
        tenant_id = uuid.UUID(payload["tenant_id"])
    except (KeyError, ValueError):
        raise credentials_error

    # Scoping by tenant_id here (not just user_id) means a token can never
    # resolve to a user outside the tenant it was issued for.
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if user is None:
        raise credentials_error
    return user


def require_role(*allowed_roles: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return user

    return dependency
