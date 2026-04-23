"""Lesson and Slide ORM models for Ed Lessons content."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Computed, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class Lesson(UUIDMixin, TimestampMixin, Base):
    """Ed Lesson with slide-based content."""

    __tablename__ = "lessons"
    __table_args__ = (
        Index("ix_lessons_search", "search_vector", postgresql_using="gin"),
        UniqueConstraint("course_id", "ed_lesson_id", name="uq_lessons_course_ed"),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    ed_lesson_id: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(255))
    number: Mapped[int | None] = mapped_column(nullable=True)
    kind: Mapped[str] = mapped_column(String(50), default="")
    state: Mapped[str] = mapped_column(String(50), default="")
    slide_count: Mapped[int] = mapped_column(default=0)
    due_at: Mapped[datetime | None] = mapped_column(nullable=True)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    title_zh: Mapped[str | None] = mapped_column(String(255), nullable=True)
    search_vector: Mapped[Any | None] = mapped_column(  # noqa: ANN401
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || "
            "setweight(to_tsvector('english', coalesce(text_content, '')), 'B')",
            persisted=True,
        ),
        nullable=True,
    )

    # Relationships
    course: Mapped[Course] = relationship(back_populates="lessons")
    slides: Mapped[list[Slide]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )


class Slide(UUIDMixin, TimestampMixin, Base):
    """Individual slide within an Ed Lesson."""

    __tablename__ = "slides"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE")
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="")
    index: Mapped[int] = mapped_column(default=0)

    # Relationships
    lesson: Mapped[Lesson] = relationship(back_populates="slides")
