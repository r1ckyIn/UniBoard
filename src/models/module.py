"""Module and ModuleItem ORM models for Canvas course modules."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Computed, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class Module(UUIDMixin, TimestampMixin, Base):
    """Canvas module containing structured course content."""

    __tablename__ = "modules"

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    canvas_module_id: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    position: Mapped[int] = mapped_column()
    ai_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    course: Mapped[Course] = relationship(back_populates="modules")
    items: Mapped[list[ModuleItem]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
    )


class ModuleItem(UUIDMixin, TimestampMixin, Base):
    """Individual item within a Canvas module."""

    __tablename__ = "module_items"
    __table_args__ = (
        Index("ix_module_items_search", "search_vector", postgresql_using="gin"),
    )

    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modules.id"))
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))
    content_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    search_vector: Mapped[Any | None] = mapped_column(  # noqa: ANN401
        TSVECTOR,
        Computed(
            "to_tsvector('simple', coalesce(title, ''))",
            persisted=True,
        ),
        nullable=True,
    )

    # Relationships
    module: Mapped[Module] = relationship(back_populates="items")
