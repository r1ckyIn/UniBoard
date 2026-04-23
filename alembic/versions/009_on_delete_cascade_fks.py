"""Add ON DELETE CASCADE to all Course/Profile/Module/Lesson child FKs.

Revision ID: 009_on_delete_cascade_fks
Revises: 008_unit_outlines_uq
Create Date: 2026-04-23 11:55:00.000000

Context
-------
ORM-level ``cascade="all, delete-orphan"`` already exists on the parent-side
relationships (``Profile.courses``, ``Course.modules``, ``Course.lessons``,
etc.), but it only fires when the ORM loads the collection into the
identity map. Raw SQL DELETEs, SAVEPOINT rollbacks that skip flush, and
future maintenance scripts all bypass the ORM and trip FK constraint
errors because the DB layer still has the default ``NO ACTION`` behaviour.

This migration drops and recreates every in-scope FK with
``ON DELETE CASCADE`` so the DB layer matches the ORM contract.

Scope (18 FKs):

- ``profiles`` -> courses.user_id, digests.user_id, ai_feedback.user_id,
  whatif_scenarios.user_id, notifications.user_id, sync_history.user_id,
  push_records.user_id
- ``courses``  -> grades.course_id, modules.course_id, skills.course_id,
  skill_executions.course_id, lessons.course_id,
  content_embeddings.course_id, unified_deadlines.course_id,
  discussion_threads.course_id, unit_outlines.course_id
- ``modules``  -> module_items.module_id
- ``lessons``  -> slides.lesson_id

Already CASCADE (untouched): deadline_user_actions.user_id,
deadline_user_actions.unified_deadline_id,
study_recommendation_cache.user_id.

Paired Supabase migration:
    supabase/migrations/20260423000001_on_delete_cascade_fks.sql
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009_on_delete_cascade_fks"
down_revision: Union[str, None] = "008_unit_outlines_uq"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (child_table, column, parent_table) tuples. Constraint name is always
# <child_table>_<column>_fkey (Postgres default).
FK_CASCADE_TARGETS: list[tuple[str, str, str]] = [
    # Parent: profiles
    ("courses", "user_id", "profiles"),
    ("digests", "user_id", "profiles"),
    ("ai_feedback", "user_id", "profiles"),
    ("whatif_scenarios", "user_id", "profiles"),
    ("notifications", "user_id", "profiles"),
    ("sync_history", "user_id", "profiles"),
    ("push_records", "user_id", "profiles"),
    # Parent: courses
    ("grades", "course_id", "courses"),
    ("modules", "course_id", "courses"),
    ("skills", "course_id", "courses"),
    ("skill_executions", "course_id", "courses"),
    ("lessons", "course_id", "courses"),
    ("content_embeddings", "course_id", "courses"),
    ("unified_deadlines", "course_id", "courses"),
    ("discussion_threads", "course_id", "courses"),
    ("unit_outlines", "course_id", "courses"),
    # Parent: modules
    ("module_items", "module_id", "modules"),
    # Parent: lessons
    ("slides", "lesson_id", "lessons"),
]


def upgrade() -> None:
    for child_table, column, parent_table in FK_CASCADE_TARGETS:
        constraint_name = f"{child_table}_{column}_fkey"
        op.execute(
            f"ALTER TABLE {child_table} "
            f"DROP CONSTRAINT IF EXISTS {constraint_name}"
        )
        op.execute(
            f"ALTER TABLE {child_table} "
            f"ADD CONSTRAINT {constraint_name} "
            f"FOREIGN KEY ({column}) REFERENCES {parent_table}(id) "
            f"ON DELETE CASCADE"
        )


def downgrade() -> None:
    # Restore default NO ACTION behaviour. Drop and re-add without ON DELETE.
    for child_table, column, parent_table in FK_CASCADE_TARGETS:
        constraint_name = f"{child_table}_{column}_fkey"
        op.execute(
            f"ALTER TABLE {child_table} "
            f"DROP CONSTRAINT IF EXISTS {constraint_name}"
        )
        op.execute(
            f"ALTER TABLE {child_table} "
            f"ADD CONSTRAINT {constraint_name} "
            f"FOREIGN KEY ({column}) REFERENCES {parent_table}(id)"
        )
