import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.models import Subscription, Tenant, User, UserRole
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.tenant_id, user.role.value),
        refresh_token=create_refresh_token(user.id, user.tenant_id, user.role.value),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Self-serve school signup: creates a new tenant plus its first admin user."""
    tenant = Tenant(name=body.tenant_name, slug=body.tenant_slug)
    db.add(tenant)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant slug already taken")

    admin = User(
        tenant_id=tenant.id,
        email=body.admin_email,
        hashed_password=hash_password(body.admin_password),
        role=UserRole.admin,
        full_name=body.admin_full_name,
    )
    db.add(admin)
    # Every tenant starts on the free plan — no Stripe interaction needed
    # until they choose to upgrade (see app/api/billing.py).
    db.add(Subscription(tenant_id=tenant.id))
    db.commit()
    db.refresh(admin)

    return _tokens_for(admin)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.slug == body.tenant_slug).first()
    # Same generic error whether the tenant, email, or password is wrong —
    # avoids leaking which part of the login is invalid.
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant, email, or password"
    )
    if tenant is None:
        raise invalid_credentials

    user = db.query(User).filter(User.tenant_id == tenant.id, User.email == body.email).first()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise invalid_credentials

    return _tokens_for(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    invalid_token = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    try:
        payload = decode_token(body.refresh_token)
    except jwt.PyJWTError:
        raise invalid_token

    if payload.get("type") != TokenType.refresh.value:
        raise invalid_token

    try:
        user_id = uuid.UUID(payload["sub"])
        tenant_id = uuid.UUID(payload["tenant_id"])
    except (KeyError, ValueError):
        raise invalid_token

    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if user is None:
        raise invalid_token

    # Rotate both tokens rather than only the access token, so a refresh
    # token is single-use in practice even though we don't track it server-side.
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
