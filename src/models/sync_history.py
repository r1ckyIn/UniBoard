"""SyncHistory ORM model for audit trail of sync operations."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, UUIDMixin


class SyncHistory(UUIDMixin, TimestampMixin, Base):
    """Audit record for each sync operation (grades, deadlines, modules)."""

    __tablename__ = "sync_history"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    domain: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    records_updated: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_sync_history_user_domain", "user_id", "domain"),
        Index("ix_sync_history_started_at", "started_at"),
    )
