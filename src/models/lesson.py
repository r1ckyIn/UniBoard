"""Lesson and Slide ORM models for Ed Lessons content."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class Lesson(UUIDMixin, TimestampMixin, Base):
    """Ed Lesson with slide-based content."""

    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    ed_lesson_id: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(255))
    number: Mapped[int | None] = mapped_column(nullable=True)
    kind: Mapped[str] = mapped_column(String(50), default="")
    state: Mapped[str] = mapped_column(String(50), default="")
    slide_count: Mapped[int] = mapped_column(default=0)
    due_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    course: Mapped[Course] = relationship(back_populates="lessons")
    slides: Mapped[list[Slide]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )


class Slide(UUIDMixin, TimestampMixin, Base):
    """Individual slide within an Ed Lesson."""

    __tablename__ = "slides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id"))
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="")
    index: Mapped[int] = mapped_column(default=0)

    # Relationships
    lesson: Mapped[Lesson] = relationship(back_populates="slides")
