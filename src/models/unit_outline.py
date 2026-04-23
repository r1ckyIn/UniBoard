"""UnitOutline ORM model for cached assessment structure."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class UnitOutline(UUIDMixin, TimestampMixin, Base):
    """Cached assessment structure parsed from USYD Unit Outline HTML."""

    __tablename__ = "unit_outlines"
    __table_args__ = (
        # Enforces uniqueness targeted by src/sync/outlines.py ON CONFLICT.
        # Paired with migration 008_unit_outlines_uq_course_semester.py and
        # Supabase migration 20260422000001_unit_outlines_uq_course_semester.sql.
        UniqueConstraint(
            "course_id", "semester", name="uq_unit_outlines_course_semester"
        ),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    outline_url: Mapped[str] = mapped_column(String(500))
    assessments: Mapped[list | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    learning_outcomes: Mapped[list | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    raw_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    fetched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    semester: Mapped[str] = mapped_column(String(20))

    # Relationships
    course: Mapped[Course] = relationship(back_populates="unit_outlines")
