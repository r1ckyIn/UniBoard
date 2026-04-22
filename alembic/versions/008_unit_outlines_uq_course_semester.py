"""Phase 27: add missing unit_outlines (course_id, semester) unique constraint.

Revision ID: 008_unit_outlines_uq
Revises: 007_phase20_skill_system
Create Date: 2026-04-22 21:45:00.000000

Context
-------
`src/sync/outlines.py::sync_all_outlines` uses
    insert_stmt.on_conflict_do_update(
        constraint="uq_unit_outlines_course_semester", ...)

The constraint was never added in `alembic/versions/004_review_fixes.py`
(which added `uq_modules_course_canvas` and `uq_lessons_course_ed` but
missed `unit_outlines`). Without the constraint the ON CONFLICT statement
raises `InvalidColumnReference: no unique or exclusion constraint matching
the ON CONFLICT specification`, which gets swallowed by the task's generic
except/retry loop -> outline data has never persisted since the feature
shipped.

This migration adds the missing constraint. Before adding, it deduplicates
any stale rows that might already violate it (keeping the row with the
most-recent fetched_at, falling back to id sort as tiebreaker).

Paired Supabase migration:
    supabase/migrations/20260422000001_unit_outlines_uq_course_semester.sql
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_unit_outlines_uq"
down_revision: Union[str, None] = "007_phase20_skill_system"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Deduplicate existing rows that would violate the upcoming unique
    # constraint. Preserves the latest fetched_at per (course_id, semester).
    op.execute(
        """
        DELETE FROM unit_outlines a
        USING unit_outlines b
        WHERE a.course_id = b.course_id
          AND a.semester = b.semester
          AND (
            COALESCE(a.fetched_at, 'epoch'::timestamptz)
              < COALESCE(b.fetched_at, 'epoch'::timestamptz)
            OR (
              COALESCE(a.fetched_at, 'epoch'::timestamptz)
                = COALESCE(b.fetched_at, 'epoch'::timestamptz)
              AND a.id < b.id
            )
          )
        """
    )

    op.create_unique_constraint(
        "uq_unit_outlines_course_semester",
        "unit_outlines",
        ["course_id", "semester"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_unit_outlines_course_semester",
        "unit_outlines",
        type_="unique",
    )
