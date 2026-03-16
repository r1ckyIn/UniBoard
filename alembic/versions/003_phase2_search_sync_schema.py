"""Phase 2 search + sync schema: tsvector columns, User sync status, Lesson text_content.

Revision ID: 003_phase2_search_sync
Revises: 002_phase2_gpa
Create Date: 2026-03-16 21:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_phase2_search_sync"
down_revision: Union[str, Sequence[str], None] = "002_phase2_gpa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tsvector columns, sync status columns, and supporting indexes."""
    # 1. Add text_content column to lessons (needed before search_vector GENERATED)
    op.add_column(
        "lessons",
        sa.Column("text_content", sa.Text, nullable=True),
    )

    # 2. Add search_vector GENERATED column to module_items
    op.execute("""
        ALTER TABLE module_items
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple', coalesce(title, ''))
        ) STORED
    """)
    op.create_index(
        "ix_module_items_search",
        "module_items",
        ["search_vector"],
        postgresql_using="gin",
    )

    # 3. Add search_vector GENERATED column to lessons (depends on text_content)
    op.execute("""
        ALTER TABLE lessons
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(text_content, '')), 'B')
        ) STORED
    """)
    op.create_index(
        "ix_lessons_search",
        "lessons",
        ["search_vector"],
        postgresql_using="gin",
    )

    # 4. Add ai_description column to modules
    op.add_column(
        "modules",
        sa.Column("ai_description", sa.Text, nullable=True),
    )

    # 5. Add sync status columns to users
    op.add_column(
        "users",
        sa.Column(
            "canvas_sync_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "users",
        sa.Column("canvas_last_synced_at", sa.DateTime, nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "ed_sync_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "users",
        sa.Column("ed_last_synced_at", sa.DateTime, nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "canvas_token_status",
            sa.String(20),
            nullable=False,
            server_default="not_configured",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "ed_token_status",
            sa.String(20),
            nullable=False,
            server_default="not_configured",
        ),
    )
    op.add_column(
        "users",
        sa.Column("last_manual_sync_at", sa.DateTime, nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "ai_calls_today",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "users",
        sa.Column("ai_calls_reset_date", sa.DateTime, nullable=True),
    )


def downgrade() -> None:
    """Reverse Phase 2 search + sync schema changes."""
    # Reverse user sync columns
    op.drop_column("users", "ai_calls_reset_date")
    op.drop_column("users", "ai_calls_today")
    op.drop_column("users", "last_manual_sync_at")
    op.drop_column("users", "ed_token_status")
    op.drop_column("users", "canvas_token_status")
    op.drop_column("users", "ed_last_synced_at")
    op.drop_column("users", "ed_sync_status")
    op.drop_column("users", "canvas_last_synced_at")
    op.drop_column("users", "canvas_sync_status")

    # Reverse modules ai_description
    op.drop_column("modules", "ai_description")

    # Reverse lessons search_vector + text_content
    op.drop_index("ix_lessons_search", table_name="lessons")
    op.drop_column("lessons", "search_vector")
    op.drop_column("lessons", "text_content")

    # Reverse module_items search_vector
    op.drop_index("ix_module_items_search", table_name="module_items")
    op.drop_column("module_items", "search_vector")
