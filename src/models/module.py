"""Module and ModuleItem ORM models for Canvas course modules."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
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

    # Relationships
    course: Mapped[Course] = relationship(back_populates="modules")
    items: Mapped[list[ModuleItem]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
    )


class ModuleItem(UUIDMixin, TimestampMixin, Base):
    """Individual item within a Canvas module."""

    __tablename__ = "module_items"

    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modules.id"))
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))
    content_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    module: Mapped[Module] = relationship(back_populates="items")
