"""StudyRecommendationCache ORM model for daily-cached LLM rec rows.

Phase 34 D-A2: daily APScheduler job (7am Australia/Sydney) UPSERTs one row
per user per day.  Frontend reads cached row -- no realtime LLM call.
"""

from __future__ import annotations

import uuid
from datetime import date as date_type
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.user import Profile


class StudyRecommendationCache(UUIDMixin, TimestampMixin, Base):
    """Daily-cached AI study recommendation row, keyed by (user, AEST date)."""

    __tablename__ = "study_recommendation_cache"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "generated_for_date",
            name="uq_study_rec_user_date",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    generated_for_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    main_suggestion: Mapped[str] = mapped_column(
        Text, nullable=False, default=""
    )
    top_3: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    language: Mapped[str] = mapped_column(
        String(5), nullable=False, default="en"
    )

    # Relationship -- Profile.study_recommendations populates this
    profile: Mapped[Profile] = relationship(
        back_populates="study_recommendations"
    )
