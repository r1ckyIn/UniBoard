"""Course ORM model with multi-platform linking."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.deadline import UnifiedDeadline
    from src.models.discussion import DiscussionThread
    from src.models.grade import Grade
    from src.models.lesson import Lesson
    from src.models.module import Module
    from src.models.unit_outline import UnitOutline
    from src.models.user import User


class Course(UUIDMixin, TimestampMixin, Base):
    """Course linked to Canvas and/or Ed platforms."""

    __tablename__ = "courses"
    __table_args__ = (
        Index("ix_courses_user_semester", "user_id", "semester"),
        Index("ix_courses_canvas_id", "user_id", "canvas_course_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    canvas_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ed_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(20))
    semester: Mapped[str] = mapped_column(String(20))
    credit_points: Mapped[int] = mapped_column(default=6)
    grading_weights: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    unit_outline_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    user: Mapped[User] = relationship(back_populates="courses")
    grades: Mapped[list[Grade]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    modules: Mapped[list[Module]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    lessons: Mapped[list[Lesson]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    discussion_threads: Mapped[list[DiscussionThread]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    unified_deadlines: Mapped[list[UnifiedDeadline]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    unit_outlines: Mapped[list[UnitOutline]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
