"""DeadlineUserAction ORM model for user-initiated pin/delete actions."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, UUIDMixin


class DeadlineUserAction(UUIDMixin, Base):
    """User-initiated actions (pin/delete) on deadlines, separate from sync."""

    __tablename__ = "deadline_user_actions"
    __table_args__ = (
        Index("ix_deadline_user_actions_user", "user_id"),
        Index("ix_deadline_user_actions_user_deadline", "user_id", "deadline_id"),
        UniqueConstraint("user_id", "deadline_id", "action_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"),
    )
    deadline_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("unified_deadlines.id", ondelete="CASCADE"),
    )
    action_type: Mapped[str] = mapped_column(String(10))  # "pinned" | "deleted"
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
