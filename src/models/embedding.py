"""ContentEmbedding ORM model for pgvector-backed RAG retrieval."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, UUIDMixin

try:
    from pgvector.sqlalchemy import VECTOR
except ImportError:  # pragma: no cover
    # Fallback for environments without pgvector installed
    from sqlalchemy import LargeBinary as VECTOR  # noqa: N811


class ContentEmbedding(UUIDMixin, TimestampMixin, Base):
    """Vector embedding for course content chunks (Voyage AI voyage-3, 1024 dim)."""

    __tablename__ = "content_embeddings"
    __table_args__ = (
        Index("ix_embeddings_course", "course_id"),
    )

    # source_type: "module_item" | "lesson" | "slide" | "mixed"
    source_type: Mapped[str] = mapped_column(String(30))
    source_id: Mapped[str] = mapped_column(String(50))
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    chunk_text: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(default=0)
    embedding: Mapped[Any] = mapped_column(VECTOR(1024))  # noqa: ANN401
