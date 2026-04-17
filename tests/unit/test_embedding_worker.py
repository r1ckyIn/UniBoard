"""Unit tests for embedding worker hot-set gating + orchestrator (AIFEAT-02).

Phase 34 Wave 3 (Plan 34-04): flipped from xfail stubs to real bodies.

Tests fall into two buckets:
  1. Pure-function tests for ``should_reembed_course`` -- deterministic, no DB
  2. Orchestrator test for ``embed_hot_courses_worker`` -- AsyncMock-driven

All tests use the recall-email pattern: explicit ``now`` parameter, no freezegun.
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.course import Course
from src.services.embedding_worker import (
    HOT_SET_WINDOW_DAYS,
    should_reembed_course,
)

# Fixed reference "now" used across all tests -- eliminates freezegun dependency.
NOW = datetime(2026, 4, 16, tzinfo=UTC)


def _make_course(
    *,
    last_qa_access_at: datetime | None = None,
    content_hash: str | None = None,
    embedded_at: datetime | None = None,
) -> Course:
    """Build a MagicMock Course -- bypasses ORM construction."""
    course = MagicMock(spec=Course)
    course.id = uuid.uuid4()
    course.last_qa_access_at = last_qa_access_at
    course.content_hash = content_hash
    course.embedded_at = embedded_at
    return course


# -----------------------------------------------------------------------------
# should_reembed_course -- pure gating function
# -----------------------------------------------------------------------------


def test_rehash_triggers_reembed() -> None:
    """AIFEAT-02: hot-set + content_hash diff -> True."""
    course = _make_course(
        last_qa_access_at=NOW - timedelta(days=1),  # hot-set
        content_hash="abc123",
        embedded_at=NOW - timedelta(days=2),
    )
    assert should_reembed_course(course, computed_hash="def456", now=NOW) is True


def test_rehash_when_never_embedded() -> None:
    """AIFEAT-02: hot-set + embedded_at IS NULL -> True (needs initial embed)."""
    course = _make_course(
        last_qa_access_at=NOW - timedelta(days=1),
        content_hash=None,
        embedded_at=None,
    )
    assert should_reembed_course(course, computed_hash="abc", now=NOW) is True


def test_skips_unaccessed_courses() -> None:
    """AIFEAT-02: cold-set (last_qa_access_at < 7d ago) -> False."""
    course = _make_course(
        last_qa_access_at=NOW - timedelta(days=HOT_SET_WINDOW_DAYS + 1),
    )
    assert should_reembed_course(course, computed_hash="anything", now=NOW) is False


def test_skips_when_never_accessed() -> None:
    """AIFEAT-02: last_qa_access_at IS NULL -> False (not in hot-set)."""
    course = _make_course(last_qa_access_at=None)
    assert should_reembed_course(course, computed_hash="anything", now=NOW) is False


def test_skips_when_hash_match() -> None:
    """AIFEAT-02: hot-set + hash matches -> False (no re-embed needed)."""
    course = _make_course(
        last_qa_access_at=NOW - timedelta(days=1),
        content_hash="abc123",
        embedded_at=NOW - timedelta(days=1),
    )
    assert should_reembed_course(course, computed_hash="abc123", now=NOW) is False


# -----------------------------------------------------------------------------
# embed_hot_courses_worker -- orchestrator (AsyncMock-driven)
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_respects_rate_limits() -> None:
    """AIFEAT-02: asyncio.sleep called between course iterations (Voyage rate limit).

    Builds 3 hot-set courses; patches compute_course_content_hash to return a
    different hash (forces re-embed); patches QAService.embed_course_materials
    + asyncio.sleep with AsyncMock; asserts sleep called >= 2 times (between
    iterations 0->1 and 1->2, skip after last).
    """
    from src.services.embedding_worker import embed_hot_courses_worker

    # Three hot-set courses, all needing re-embed (content_hash=None triggers embedded_at check)
    course_ids = [uuid.uuid4() for _ in range(3)]
    mock_courses = [
        _make_course(
            last_qa_access_at=NOW - timedelta(days=1),
            content_hash=None,  # No hash -> always diff from computed
            embedded_at=None,  # Never embedded -> forces re-embed
        )
        for _ in range(3)
    ]
    for c, cid in zip(mock_courses, course_ids, strict=True):
        c.id = cid

    # Track session factory calls: #1 = list candidates, #2-4 = per-course
    call_count = {"n": 0}

    def _make_mock_session() -> AsyncMock:
        session = AsyncMock()
        call_count["n"] += 1
        if call_count["n"] == 1:
            # Phase 1: list course IDs
            phase1_result = MagicMock()
            phase1_result.all = MagicMock(return_value=[(cid,) for cid in course_ids])
            session.execute = AsyncMock(return_value=phase1_result)
        else:
            # Phase 2: per-course session -- return one of the mock courses
            course_idx = call_count["n"] - 2
            if course_idx < len(mock_courses):
                session.get = AsyncMock(return_value=mock_courses[course_idx])
            session.commit = AsyncMock()
        return session

    @asynccontextmanager
    async def _factory_call() -> Any:  # type: ignore[misc]
        yield _make_mock_session()

    def _factory() -> Any:  # type: ignore[misc]
        """Mimic async_sessionmaker() -> async context manager."""
        return _factory_call()

    # Patch QAService.embed_course_materials + asyncio.sleep + compute hash
    with patch(
        "src.services.qa.QAService.embed_course_materials",
        new=AsyncMock(return_value=5),
    ), patch(
        "src.services.embedding_worker.compute_course_content_hash",
        new=AsyncMock(return_value="new_hash"),
    ), patch(
        "src.services.embedding_worker.asyncio.sleep",
        new=AsyncMock(),
    ) as mock_sleep:
        stats = await embed_hot_courses_worker(_factory)

    assert stats["considered"] == 3
    # Sleep called between iterations (idx 0->1, 1->2): exactly 2 times
    assert mock_sleep.call_count >= 2
