"""PushRecord ORM model for deduplicating notifications."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.user import User


class PushRecord(UUIDMixin, TimestampMixin, Base):
    """Record of pushed notifications for deduplication."""

    __tablename__ = "push_records"
    __table_args__ = (
        Index("ix_push_records_user_hash", "user_id", "content_hash", unique=True),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    content_hash: Mapped[str] = mapped_column(String(64))
    source_type: Mapped[str] = mapped_column(String(30))
    source_id: Mapped[str] = mapped_column(String(100))
    pushed_at: Mapped[datetime] = mapped_column()
    channel: Mapped[str] = mapped_column(String(20))

    # Relationships
    user: Mapped[User] = relationship(back_populates="push_records")
