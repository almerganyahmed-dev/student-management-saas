import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.crud_utils import get_tenant_scoped_or_404
from app.api.deps import get_current_user, get_own_student, require_role
from app.db.session import get_db
from app.models.models import Attendance, User, UserRole
from app.schemas.academics import AttendanceCreate, AttendanceOut, AttendanceUpdate

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def create_attendance(
    body: AttendanceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    record = Attendance(
        tenant_id=user.tenant_id,
        student_id=body.student_id,
        class_id=body.class_id,
        date=body.date,
        status=body.status,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already recorded for this student/class/date",
        )
    db.refresh(record)
    return record


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    student_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Attendance).filter(Attendance.tenant_id == user.tenant_id)

    if user.role == UserRole.student:
        # A student only ever sees their own attendance, regardless of what
        # student_id they pass in — classmates' records are never their business.
        own_student = get_own_student(db, user)
        query = query.filter(Attendance.student_id == (own_student.id if own_student else None))
    elif student_id is not None:
        query = query.filter(Attendance.student_id == student_id)

    if class_id is not None:
        query = query.filter(Attendance.class_id == class_id)

    return query.order_by(Attendance.date.desc()).all()


@router.get("/{attendance_id}", response_model=AttendanceOut)
def get_attendance(attendance_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = get_tenant_scoped_or_404(db, Attendance, attendance_id, user.tenant_id)
    if user.role == UserRole.student:
        own_student = get_own_student(db, user)
        if own_student is None or record.student_id != own_student.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")
    return record


@router.patch("/{attendance_id}", response_model=AttendanceOut)
def update_attendance(
    attendance_id: uuid.UUID,
    body: AttendanceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    record = get_tenant_scoped_or_404(db, Attendance, attendance_id, user.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    record = get_tenant_scoped_or_404(db, Attendance, attendance_id, user.tenant_id)
    db.delete(record)
    db.commit()
