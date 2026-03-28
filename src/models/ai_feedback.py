"""AIFeedback and AIQualityMetrics ORM models for quality gate monitoring."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, UUIDMixin


class AIFeedback(UUIDMixin, TimestampMixin, Base):
    """User feedback on AI-scored discussion threads (thumbs up/down)."""

    __tablename__ = "ai_feedback"
    __table_args__ = (
        UniqueConstraint("user_id", "thread_id", name="uq_feedback_user_thread"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("discussion_threads.id"))
    feedback_type: Mapped[str] = mapped_column(String(20))  # thumbs_up | thumbs_down


class AIQualityMetrics(UUIDMixin, TimestampMixin, Base):
    """Snapshot of AI quality gate metrics (F1, precision, recall, fallback state)."""

    __tablename__ = "ai_quality_metrics"

    total_feedback: Mapped[int] = mapped_column(default=0)
    f1_score: Mapped[float] = mapped_column(Float, default=0.0)
    precision: Mapped[float] = mapped_column(Float, default=0.0)
    recall: Mapped[float] = mapped_column(Float, default=0.0)
    calculated_at: Mapped[datetime] = mapped_column()
    is_fallback_active: Mapped[bool] = mapped_column(default=False)
