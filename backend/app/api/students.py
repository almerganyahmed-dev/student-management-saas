import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.crud_utils import get_tenant_scoped_or_404
from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.models import Student, User, UserRole
from app.schemas.academics import StudentCreate, StudentOut, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    body: StudentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    student = Student(
        tenant_id=user.tenant_id,
        first_name=body.first_name,
        last_name=body.last_name,
        class_id=body.class_id,
        user_id=body.user_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("", response_model=list[StudentOut])
def list_students(
    class_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Student).filter(Student.tenant_id == user.tenant_id)
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    return query.order_by(Student.last_name, Student.first_name).all()


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_tenant_scoped_or_404(db, Student, student_id, user.tenant_id)


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: uuid.UUID,
    body: StudentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    student = get_tenant_scoped_or_404(db, Student, student_id, user.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
):
    student = get_tenant_scoped_or_404(db, Student, student_id, user.tenant_id)
    db.delete(student)
    db.commit()
