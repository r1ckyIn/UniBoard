"""Phase 2 GPA schema: whatif_scenarios table, User target columns, Grade unique constraint.

Revision ID: 002_phase2_gpa
Revises: 1eb0cbc46f28
Create Date: 2026-03-16 20:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "002_phase2_gpa"
down_revision: Union[str, Sequence[str], None] = "1eb0cbc46f28"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Phase 2 GPA schema changes."""
    # 1. Create whatif_scenarios table
    op.create_table(
        "whatif_scenarios",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("scores_json", JSONB, nullable=False),
        sa.Column("result_wam", sa.Float, nullable=False),
        sa.Column("result_gpa", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_whatif_scenarios_user",
        "whatif_scenarios",
        ["user_id"],
    )

    # 2. Add target_gpa_7pt column to users table
    op.add_column(
        "users",
        sa.Column("target_gpa_7pt", sa.Float, nullable=True),
    )

    # 3. Add unique constraint on grades (course_id, assessment_name) for upsert support
    op.create_unique_constraint(
        "uq_grades_course_assessment",
        "grades",
        ["course_id", "assessment_name"],
    )


def downgrade() -> None:
    """Reverse Phase 2 GPA schema changes."""
    # Reverse order
    op.drop_constraint("uq_grades_course_assessment", "grades", type_="unique")
    op.drop_column("users", "target_gpa_7pt")
    op.drop_index("ix_whatif_scenarios_user", table_name="whatif_scenarios")
    op.drop_table("whatif_scenarios")
