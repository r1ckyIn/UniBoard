"""Skill and SkillExecution ORM models for MCP Agent workflow templates."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, UUIDMixin


class Skill(UUIDMixin, TimestampMixin, Base):
    """Reusable prompt template for a specific operation type.

    Global skills have course_id=None; per-course skills link to a Course.
    JSONB columns store workflow_steps, tool_sequence, and parameters.
    """

    __tablename__ = "skills"
    __table_args__ = (
        Index("ix_skills_lookup", "operation_type", "course_id", "status"),
    )

    operation_type: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(30))
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True
    )
    system_prompt: Mapped[str] = mapped_column(Text)
    workflow_steps: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    tool_sequence: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    parameters: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    output_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    is_seeded: Mapped[bool] = mapped_column(default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[datetime | None] = mapped_column(nullable=True)


class SkillExecution(UUIDMixin, TimestampMixin, Base):
    """Record of a single skill execution with trace and metrics.

    skill_id is NULL for exploration runs (no skill template used).
    """

    __tablename__ = "skill_executions"
    __table_args__ = (
        Index("ix_skill_exec_lookup", "operation_type", "course_id", "success"),
    )

    operation_type: Mapped[str] = mapped_column(String(50))
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True
    )
    skill_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id"), nullable=True
    )
    execution_trace: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    success: Mapped[bool] = mapped_column(default=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
