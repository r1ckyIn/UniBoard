"""Grade ORM model for course assessment scores."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class Grade(UUIDMixin, TimestampMixin, Base):
    """Individual assessment grade within a course."""

    __tablename__ = "grades"
    __table_args__ = (
        Index("ix_grades_course", "course_id", "graded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    assessment_name: Mapped[str] = mapped_column(String(255))
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float] = mapped_column(Float)
    weight: Mapped[float] = mapped_column(Float)
    group_name: Mapped[str] = mapped_column(String(255), default="")
    submitted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    course: Mapped[Course] = relationship(back_populates="grades")
