"""add grades table

Revision ID: 3eeedf2cb7a4
Revises: a1ba86fae46b
Create Date: 2026-07-01 23:33:33.740937

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "3eeedf2cb7a4"
down_revision = "a1ba86fae46b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "grades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False, server_default="100"),
        sa.Column("graded_at", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_grades_tenant_id", "grades", ["tenant_id"])
    op.create_index("ix_grades_student_id", "grades", ["student_id"])
    op.create_index("ix_grades_class_id", "grades", ["class_id"])


def downgrade() -> None:
    op.drop_index("ix_grades_class_id", table_name="grades")
    op.drop_index("ix_grades_student_id", table_name="grades")
    op.drop_index("ix_grades_tenant_id", table_name="grades")
    op.drop_table("grades")
