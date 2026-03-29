"""Phase 20: Skill system tables for MCP Agent workflow templates.

Revision ID: 007_phase20_skill_system
Revises: 006_phase4_embeddings
Create Date: 2026-03-29 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

# revision identifiers, used by Alembic.
revision: str = "007_phase20_skill_system"
down_revision: Union[str, None] = "006_phase4_embeddings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create skills and skill_executions tables with JSONB columns and indexes."""
    op.create_table(
        "skills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("operation_type", sa.String(50), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column(
            "course_id",
            UUID(as_uuid=True),
            sa.ForeignKey("courses.id"),
            nullable=True,
        ),
        sa.Column("system_prompt", sa.Text, nullable=False),
        sa.Column("workflow_steps", JSON, nullable=True),
        sa.Column("tool_sequence", JSON, nullable=True),
        sa.Column("parameters", JSON, nullable=True),
        sa.Column("output_format", sa.Text, nullable=True),
        sa.Column(
            "status", sa.String(20), server_default="draft", nullable=False
        ),
        sa.Column(
            "is_seeded", sa.Boolean, server_default="false", nullable=False
        ),
        sa.Column("version", sa.Integer, server_default="1", nullable=False),
        sa.Column(
            "success_count", sa.Integer, server_default="0", nullable=False
        ),
        sa.Column(
            "failure_count", sa.Integer, server_default="0", nullable=False
        ),
        sa.Column("last_used_at", sa.DateTime, nullable=True),
        sa.Column(
            "created_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_skills_lookup", "skills", ["operation_type", "course_id", "status"]
    )

    op.create_table(
        "skill_executions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("operation_type", sa.String(50), nullable=False),
        sa.Column(
            "course_id",
            UUID(as_uuid=True),
            sa.ForeignKey("courses.id"),
            nullable=True,
        ),
        sa.Column(
            "skill_id",
            UUID(as_uuid=True),
            sa.ForeignKey("skills.id"),
            nullable=True,
        ),
        sa.Column("execution_trace", JSON, nullable=True),
        sa.Column(
            "success", sa.Boolean, server_default="false", nullable=False
        ),
        sa.Column(
            "latency_ms", sa.Integer, server_default="0", nullable=False
        ),
        sa.Column(
            "tokens_used", sa.Integer, server_default="0", nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_skill_exec_lookup",
        "skill_executions",
        ["operation_type", "course_id", "success"],
    )


def downgrade() -> None:
    """Drop skill_executions and skills tables."""
    op.drop_index("ix_skill_exec_lookup", table_name="skill_executions")
    op.drop_table("skill_executions")
    op.drop_index("ix_skills_lookup", table_name="skills")
    op.drop_table("skills")
