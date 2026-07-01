import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.crud_utils import get_tenant_scoped_or_404
from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.models import SchoolClass, User, UserRole
from app.schemas.academics import ClassCreate, ClassOut, ClassUpdate

router = APIRouter(prefix="/classes", tags=["classes"])


@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(
    body: ClassCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    school_class = SchoolClass(tenant_id=user.tenant_id, name=body.name, teacher_id=body.teacher_id)
    db.add(school_class)
    db.commit()
    db.refresh(school_class)
    return school_class


@router.get("", response_model=list[ClassOut])
def list_classes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(SchoolClass).filter(SchoolClass.tenant_id == user.tenant_id).order_by(SchoolClass.name).all()


@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_tenant_scoped_or_404(db, SchoolClass, class_id, user.tenant_id)


@router.patch("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: uuid.UUID,
    body: ClassUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    school_class = get_tenant_scoped_or_404(db, SchoolClass, class_id, user.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(school_class, field, value)
    db.commit()
    db.refresh(school_class)
    return school_class


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
):
    school_class = get_tenant_scoped_or_404(db, SchoolClass, class_id, user.tenant_id)
    db.delete(school_class)
    db.commit()
