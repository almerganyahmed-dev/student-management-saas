import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.crud_utils import delete_or_conflict, get_tenant_scoped_or_404
from app.api.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.models import User, UserRole
from app.schemas.auth import UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    """Admin-only: invite a teacher or student into the tenant. The invitee
    logs in afterward with the password set here — there's no separate
    invite-link/email flow yet."""
    user = User(
        tenant_id=admin.tenant_id,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        full_name=body.full_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use for this tenant")
    db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_role(UserRole.admin))):
    return db.query(User).filter(User.tenant_id == admin.tenant_id).order_by(User.full_name).all()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    user = get_tenant_scoped_or_404(db, User, user_id, admin.tenant_id)
    delete_or_conflict(db, user)
