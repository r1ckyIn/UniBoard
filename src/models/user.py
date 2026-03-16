"""User ORM model with encrypted token fields."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course
    from src.models.push_record import PushRecord


class User(UUIDMixin, TimestampMixin, Base):
    """User account with encrypted API tokens."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100), default="")
    university_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    canvas_api_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    ed_api_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    gpa_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    gpa_scale: Mapped[str] = mapped_column(String(10), default="wam")
    last_sync_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    courses: Mapped[list[Course]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    push_records: Mapped[list[PushRecord]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
