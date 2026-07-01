import datetime as dt
import uuid

from pydantic import BaseModel, Field

from app.models.models import AttendanceStatus

# --- Classes ---


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    teacher_id: uuid.UUID | None = None


class ClassUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    teacher_id: uuid.UUID | None = None


class ClassOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    teacher_id: uuid.UUID | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# --- Students ---


class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    class_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None


class StudentUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    class_id: uuid.UUID | None = None


class StudentOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID | None
    class_id: uuid.UUID | None
    first_name: str
    last_name: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# --- Attendance ---


class AttendanceCreate(BaseModel):
    student_id: uuid.UUID
    class_id: uuid.UUID
    date: dt.date
    status: AttendanceStatus


class AttendanceUpdate(BaseModel):
    status: AttendanceStatus | None = None
    date: dt.date | None = None


class AttendanceOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    student_id: uuid.UUID
    class_id: uuid.UUID
    date: dt.date
    status: AttendanceStatus
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# --- Grades ---


class GradeCreate(BaseModel):
    student_id: uuid.UUID
    class_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    score: float = Field(ge=0)
    max_score: float = Field(default=100, gt=0)
    graded_at: dt.date


class GradeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    score: float | None = Field(default=None, ge=0)
    max_score: float | None = Field(default=None, gt=0)
    graded_at: dt.date | None = None


class GradeOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    student_id: uuid.UUID
    class_id: uuid.UUID
    title: str
    score: float
    max_score: float
    graded_at: dt.date
    created_at: dt.datetime

    model_config = {"from_attributes": True}
