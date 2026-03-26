"""WhatIfScenario ORM model for GPA simulation persistence."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.user import Profile


class WhatIfScenario(UUIDMixin, TimestampMixin, Base):
    """Persistent What-if GPA scenario with hypothetical scores."""

    __tablename__ = "whatif_scenarios"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    name: Mapped[str] = mapped_column(String(255))
    scores_json: Mapped[dict[str, Any]] = mapped_column(JSONB)
    result_wam: Mapped[float] = mapped_column(Float)
    result_gpa: Mapped[float] = mapped_column(Float)

    # Relationships
    profile: Mapped[Profile] = relationship(back_populates="whatif_scenarios")
