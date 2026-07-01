import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.crud_utils import get_tenant_scoped_or_404
from app.api.deps import get_current_user, get_own_student, require_role
from app.db.session import get_db
from app.models.models import Grade, User, UserRole
from app.schemas.academics import GradeCreate, GradeOut, GradeUpdate

router = APIRouter(prefix="/grades", tags=["grades"])


@router.post("", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
def create_grade(
    body: GradeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    grade = Grade(
        tenant_id=user.tenant_id,
        student_id=body.student_id,
        class_id=body.class_id,
        title=body.title,
        score=body.score,
        max_score=body.max_score,
        graded_at=body.graded_at,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


@router.get("", response_model=list[GradeOut])
def list_grades(
    student_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Grade).filter(Grade.tenant_id == user.tenant_id)

    if user.role == UserRole.student:
        own_student = get_own_student(db, user)
        query = query.filter(Grade.student_id == (own_student.id if own_student else None))
    elif student_id is not None:
        query = query.filter(Grade.student_id == student_id)

    if class_id is not None:
        query = query.filter(Grade.class_id == class_id)

    return query.order_by(Grade.graded_at.desc()).all()


@router.get("/{grade_id}", response_model=GradeOut)
def get_grade(grade_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    grade = get_tenant_scoped_or_404(db, Grade, grade_id, user.tenant_id)
    if user.role == UserRole.student:
        own_student = get_own_student(db, user)
        if own_student is None or grade.student_id != own_student.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    return grade


@router.patch("/{grade_id}", response_model=GradeOut)
def update_grade(
    grade_id: uuid.UUID,
    body: GradeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    grade = get_tenant_scoped_or_404(db, Grade, grade_id, user.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(grade, field, value)
    db.commit()
    db.refresh(grade)
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    grade = get_tenant_scoped_or_404(db, Grade, grade_id, user.tenant_id)
    db.delete(grade)
    db.commit()
