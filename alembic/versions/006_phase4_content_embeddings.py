"""Phase 4: Content embeddings table for RAG.

Revision ID: 006_phase4_embeddings
Revises: 005_phase4_notif_digest
Create Date: 2026-03-17 04:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "006_phase4_embeddings"
down_revision: Union[str, None] = "005_phase4_notif_digest"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create content_embeddings table with pgvector HNSW index."""
    # The vector extension was already created in migration 005 (with graceful fallback).
    # Create content_embeddings table
    op.create_table(
        "content_embeddings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("source_id", sa.String(50), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        # embedding column added via raw SQL below (pgvector VECTOR type)
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Create course index
    op.create_index("ix_embeddings_course", "content_embeddings", ["course_id"])

    # Create HNSW vector index (requires pgvector extension)
    op.execute(
        "DO $$ BEGIN "
        "ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS "
        "embedding vector(1024); "
        "EXCEPTION WHEN OTHERS THEN "
        "RAISE NOTICE 'pgvector not available, embedding column not added'; "
        "END $$"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE INDEX ix_embeddings_vector ON content_embeddings "
        "USING hnsw (embedding vector_cosine_ops); "
        "EXCEPTION WHEN OTHERS THEN "
        "RAISE NOTICE 'HNSW index creation skipped (pgvector not available)'; "
        "END $$"
    )


def downgrade() -> None:
    """Drop content_embeddings table."""
    op.execute("DROP INDEX IF EXISTS ix_embeddings_vector")
    op.execute("DROP INDEX IF EXISTS ix_embeddings_course")
    op.drop_table("content_embeddings")
