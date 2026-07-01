"""add enterprise subscription plan

Revision ID: 1351008cd3df
Revises: 3eeedf2cb7a4
Create Date: 2026-07-02 01:36:14.902280

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "1351008cd3df"
down_revision = "3eeedf2cb7a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE subscription_plan ADD VALUE 'enterprise'")


def downgrade() -> None:
    # Postgres has no DROP VALUE for enums — removing one requires rebuilding
    # the type and would fail outright if any row already uses 'enterprise'.
    # Not worth the risk for a downgrade path; roll back to a backup instead
    # if this ever needs to be undone.
    pass
