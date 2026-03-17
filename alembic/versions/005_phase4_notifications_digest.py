"""Phase 4: Notifications and Digest tables.

Revision ID: 005_phase4_notif_digest
Revises: 004_review_fixes
Create Date: 2026-03-17 04:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

# revision identifiers, used by Alembic.
revision: str = "005_phase4_notif_digest"
down_revision: Union[str, None] = "004_review_fixes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create notifications and digests tables; enable vector extension."""
    # Enable pgvector extension for Plan 04-02 ContentEmbedding table
    # Wrapped in DO block so it doesn't fail if pgvector is not yet installed
    op.execute(
        "DO $$ BEGIN "
        "CREATE EXTENSION IF NOT EXISTS vector; "
        "EXCEPTION WHEN OTHERS THEN "
        "RAISE NOTICE 'pgvector not available, will be added when container is rebuilt'; "
        "END $$"
    )

    # Notifications table
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean, server_default="false", nullable=False),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("metadata_json", JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_notifications_user_unread",
        "notifications",
        ["user_id", "is_read"],
    )

    # Digests table
    op.create_table(
        "digests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("digest_date", sa.DateTime, nullable=False),
        sa.Column("content_json", JSON, nullable=False),
        sa.Column("ai_summary", sa.Text, nullable=True),
        sa.Column("is_sent_email", sa.Boolean, server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_digests_user_date",
        "digests",
        ["user_id", "digest_date"],
    )


def downgrade() -> None:
    """Drop notifications and digests tables."""
    op.drop_table("digests")
    op.drop_index("ix_notifications_user_unread", table_name="notifications")
    op.drop_table("notifications")
