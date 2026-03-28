"""UnifiedDeadline ORM model for three-source deadline aggregation."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class UnifiedDeadline(UUIDMixin, TimestampMixin, Base):
    """Deduplicated deadline from Canvas, Ed Lessons, Ed Discussion, or Unit Outline."""

    __tablename__ = "unified_deadlines"
    __table_args__ = (
        Index("ix_deadlines_course_due", "course_id", "due_date"),
        Index("ix_deadlines_dedup", "dedup_key", unique=True),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    title: Mapped[str] = mapped_column(String(255))
    due_date: Mapped[datetime] = mapped_column()
    source: Mapped[str] = mapped_column(String(30))
    source_id: Mapped[str] = mapped_column(String(100))
    weight: Mapped[float | None] = mapped_column(nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    dedup_key: Mapped[str] = mapped_column(String(64))
    is_confirmed: Mapped[bool] = mapped_column(default=True)
    title_zh: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    course: Mapped[Course] = relationship(back_populates="unified_deadlines")
