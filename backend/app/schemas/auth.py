import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.models import UserRole

# bcrypt silently ignores/rejects bytes past 72 — cap here so long input is a
# clean 422 instead of a 500 at hash time.
PASSWORD_MAX_LENGTH = 72


class RegisterRequest(BaseModel):
    tenant_name: str = Field(min_length=1, max_length=255)
    tenant_slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    admin_full_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    tenant_slug: str
    email: EmailStr
    password: str = Field(max_length=PASSWORD_MAX_LENGTH)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str
    role: UserRole

    model_config = {"from_attributes": True}
