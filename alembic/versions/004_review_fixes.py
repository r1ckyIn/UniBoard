"""Review fixes: drop target_gpa_7pt, add modules unique constraint.

Revision ID: 004_review_fixes
Revises: 003_phase2_search_sync
Create Date: 2026-03-16 23:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004_review_fixes"
down_revision: Union[str, None] = "003_phase2_search_sync"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop unused target_gpa_7pt column from users
    op.drop_column("users", "target_gpa_7pt")

    # Add unique constraint on modules (course_id, canvas_module_id) for upsert dedup
    op.create_unique_constraint(
        "uq_modules_course_canvas",
        "modules",
        ["course_id", "canvas_module_id"],
    )

    # Add unique constraint on lessons (course_id, ed_lesson_id) for upsert dedup
    op.create_unique_constraint(
        "uq_lessons_course_ed",
        "lessons",
        ["course_id", "ed_lesson_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_lessons_course_ed", "lessons", type_="unique")
    op.drop_constraint("uq_modules_course_canvas", "modules", type_="unique")
    op.add_column("users", sa.Column("target_gpa_7pt", sa.Float(), nullable=True))
