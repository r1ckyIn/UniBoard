"""Hot-set embedding worker for RAG (AIFEAT-02 / D-B1, D-B2).

Iterates COURSES (not users) where last_qa_access_at is within the hot-set
window AND content_hash differs from computed (or NULL). Calls existing
QAService.embed_course_materials per gated course.

Pure functions (``should_reembed_course``, ``compute_course_content_hash``)
make scheduler tests possible without freezegun -- they mirror the Phase 33
recall_email pattern (explicit ``now`` parameter).

Two-phase iteration:
  1. List candidate course_ids in a short transaction (snapshot)
  2. Per-course re-embed with a fresh session each course (isolate failures)

Voyage rate-limit headroom: ``asyncio.sleep(INTER_COURSE_SLEEP_SEC)`` between
course iterations. Per RESEARCH §10 Voyage rate limits.
"""

from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import sentry_sdk
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.models.course import Course
from src.models.lesson import Lesson
from src.models.module import Module, ModuleItem

logger = structlog.get_logger()

HOT_SET_WINDOW_DAYS = 7
INTER_COURSE_SLEEP_SEC = 0.1  # Voyage rate-limit headroom (RESEARCH §10)


def should_reembed_course(
    course: Course,
    computed_hash: str,
    *,
    now: datetime | None = None,
) -> bool:
    """Pure gating: True iff course is in hot-set AND hash differs.

    - Hot-set: ``last_qa_access_at >= now - HOT_SET_WINDOW_DAYS`` (7 days).
    - Hash diff: ``computed_hash != stored content_hash``, OR
      ``embedded_at IS NULL``.

    The optional ``now`` parameter exists for deterministic testing (no
    freezegun). Mirrors src/services/recall_email.should_send_recall_email.
    """
    reference = now or datetime.now(UTC)
    cutoff = reference - timedelta(days=HOT_SET_WINDOW_DAYS)

    # Hot-set check
    if course.last_qa_access_at is None or course.last_qa_access_at < cutoff:
        return False

    # Never embedded -> needs initial embed
    if course.embedded_at is None:
        return True

    # Hash diff -> re-embed
    return course.content_hash != computed_hash


async def compute_course_content_hash(
    session: AsyncSession,
    course_id: uuid.UUID,
) -> str:
    """Compute sha256 hex over joined module_items + lessons text content.

    Stored on Course (per 34-01 D-B2 deviation: content_hash on Course, not
    Module, because the embedding pipeline is per-course).

    Hash is stable across runs as long as content is unchanged: items and
    lessons are sorted by (module_id, id) and id respectively so ordering
    does not depend on PostgreSQL row insertion order.
    """
    # Load all module items for this course (sorted for hash stability)
    items_stmt = (
        select(ModuleItem)
        .join(Module, ModuleItem.module_id == Module.id)
        .where(Module.course_id == course_id)
        .order_by(Module.id, ModuleItem.id)
    )
    items_result = await session.execute(items_stmt)
    items = list(items_result.scalars().all())

    # Load all lessons for this course (sorted for hash stability)
    lessons_stmt = (
        select(Lesson)
        .where(Lesson.course_id == course_id)
        .order_by(Lesson.id)
    )
    lessons_result = await session.execute(lessons_stmt)
    lessons = list(lessons_result.scalars().all())

    # Concatenate text content with delimiter (avoids hash collision across
    # different boundary partitionings of the same total bytes).
    parts: list[str] = []
    for item in items:
        text = getattr(item, "text_content", None) or ""
        parts.append(f"item:{item.id}:{text}")
    for lesson in lessons:
        text = lesson.text_content or ""
        parts.append(f"lesson:{lesson.id}:{text}")

    joined = "\n---\n".join(parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


async def embed_hot_courses_worker(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, int]:
    """Iterate hot-set courses, re-embed if content_hash diff.

    Per RESEARCH §6 design: iterate COURSES (not users). Predicate:
        WHERE last_qa_access_at >= now() - 7d
          AND (content_hash IS NULL OR computed_hash != content_hash)

    Returns counters dict: ``{"considered": N, "re_embedded": M, "errors": K}``.

    Sleeps ``INTER_COURSE_SLEEP_SEC`` between course iterations (Voyage rate
    limit). Per-course failures are captured to Sentry with
    ``phase=34 / feature=rag_embedding`` tags but do not abort the batch.
    """
    # Import here to avoid circular import (qa.py imports config + models that
    # may trigger embedding worker imports in tests).
    from src.config import get_settings
    from src.services.ai_engine import AIEngine
    from src.services.qa import QAService

    now = datetime.now(UTC)
    cutoff = now - timedelta(days=HOT_SET_WINDOW_DAYS)
    considered = 0
    re_embedded = 0
    errors = 0

    # Phase 1: list candidate course_ids (short transaction)
    async with session_factory() as session:
        stmt = (
            select(Course.id)
            .where(Course.last_qa_access_at.is_not(None))
            .where(Course.last_qa_access_at >= cutoff)
        )
        result = await session.execute(stmt)
        course_ids = [row[0] for row in result.all()]

    # Phase 2: per-course re-embed (fresh session each course -> isolate failures)
    for idx, course_id in enumerate(course_ids):
        considered += 1
        try:
            async with session_factory() as session:
                course = await session.get(Course, course_id)
                if course is None:
                    continue

                computed_hash = await compute_course_content_hash(session, course_id)

                if not should_reembed_course(course, computed_hash, now=now):
                    continue

                # Call existing embed pipeline (DO NOT REIMPLEMENT)
                settings = get_settings()
                engine = AIEngine(api_key=settings.anthropic_api_key)
                qa_svc = QAService(
                    session=session,
                    ai_engine=engine,
                    voyage_api_key=settings.voyage_api_key,
                )
                chunk_count = await qa_svc.embed_course_materials(course_id)

                # Persist hash + embedded_at
                course.content_hash = computed_hash
                course.embedded_at = now
                await session.commit()
                re_embedded += 1
                logger.info(
                    "embed_hot_course_done",
                    course_id=str(course_id),
                    chunks=chunk_count,
                    hash_prefix=computed_hash[:8],  # log prefix only
                )

                # Gemini review suggestion: log Voyage usage proxy to Sentry
                # for production tier monitoring. When Voyage SDK exposes
                # response headers (X-Voyage-Token-Usage), swap chunks for
                # the actual token count.
                sentry_sdk.set_context(
                    "voyage_usage",
                    {
                        "course_id": str(course_id),
                        "chunks_embedded": chunk_count,
                    },
                )
        except Exception:  # noqa: BLE001
            errors += 1
            with sentry_sdk.new_scope() as scope:
                scope.set_tag("phase", "34")
                scope.set_tag("feature", "rag_embedding")
                sentry_sdk.capture_exception()
            logger.warning(
                "embed_hot_course_failed",
                course_id=str(course_id),
                exc_info=True,
            )

        # Voyage rate-limit headroom -- sleep between courses (skip after last)
        if idx < len(course_ids) - 1:
            await asyncio.sleep(INTER_COURSE_SLEEP_SEC)

    logger.info(
        "embed_hot_courses_worker_done",
        considered=considered,
        re_embedded=re_embedded,
        errors=errors,
    )
    return {"considered": considered, "re_embedded": re_embedded, "errors": errors}
