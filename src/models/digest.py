"""Digest ORM model for stored daily digest snapshots."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.user import User


class Digest(UUIDMixin, TimestampMixin, Base):
    """Daily digest snapshot with optional AI-generated summary."""

    __tablename__ = "digests"
    __table_args__ = (
        UniqueConstraint("user_id", "digest_date", name="uq_digests_user_date"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    digest_date: Mapped[datetime] = mapped_column()
    content_json: Mapped[dict[str, Any]] = mapped_column(JSON)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_sent_email: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # Relationships
    user: Mapped[User] = relationship(back_populates="digests")
