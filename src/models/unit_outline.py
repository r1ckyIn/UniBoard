"""UnitOutline ORM model for cached assessment structure."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class UnitOutline(UUIDMixin, TimestampMixin, Base):
    """Cached assessment structure parsed from USYD Unit Outline HTML."""

    __tablename__ = "unit_outlines"

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
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
