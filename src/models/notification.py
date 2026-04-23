"""Notification ORM model for in-app and email notifications."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.user import Profile


class Notification(UUIDMixin, TimestampMixin, Base):
    """User notification with type-based severity and optional action URL."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(String(30))  # deadline_reminder, gpa_risk, digest, system
    severity: Mapped[str] = mapped_column(String(20))  # critical, warning, info
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    profile: Mapped[Profile] = relationship(back_populates="notifications")
