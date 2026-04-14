"""Unit tests for DeadlineService.aggregate_and_dedup — SYNC-FIX-04 null due_at handling.

Before the fix, ``str(assignment.get("due_at", ""))`` coerced ``None`` to the
literal ``"None"``, which passed the truthy guard and then blew up inside
``datetime.fromisoformat``. The loop swallowed the ``ValueError`` via
``continue`` so the entire downstream flow for courses with mixed dated/undated
assignments silently collapsed to 1 deadline (or 0). These tests lock down the
post-fix behavior: null/non-string/empty ``due_at`` values are skipped silently
and only the valid ISO-8601 strings flow into the insert path.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.models.course import Course
from src.services.deadline import DeadlineService

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


def _make_course() -> Course:
    """Build a minimally-valid Course ORM instance for aggregate_and_dedup."""
    course = Course()
    course.id = uuid.uuid4()
    course.user_id = uuid.uuid4()
    course.code = "COMP2017"
    course.name = "Systems Programming"
    course.semester = "2026-S1"
    course.canvas_course_id = "12345"
    return course


def _make_service_with_empty_existing() -> tuple[DeadlineService, AsyncMock]:
    """Return a DeadlineService whose session.execute returns empty existing deadlines.

    The service's aggregate_and_dedup first SELECTs existing deadlines for the
    course; we return an empty scalars() iterable so every new deadline is treated
    as novel. We also return an empty result for subsequent INSERT executions.
    """
    session = AsyncMock()
    # First call (SELECT existing): result.scalars().all() -> []
    select_result = MagicMock()
    select_result.scalars.return_value.all.return_value = []

    # Subsequent calls (INSERT ... ON CONFLICT): return a no-op result.
    insert_result = MagicMock()

    # Sequence: first execute returns select_result, then insert_result for every
    # subsequent call (one per inserted deadline).
    call_count = {"n": 0}

    async def execute_side_effect(*_args: Any, **_kwargs: Any) -> MagicMock:
        call_count["n"] += 1
        return select_result if call_count["n"] == 1 else insert_result

    session.execute.side_effect = execute_side_effect
    return DeadlineService(session), session


@pytest.mark.asyncio
async def test_null_due_at_handling() -> None:
    """Given 5 assignments (3 with due_at, 2 with null), aggregator inserts exactly 3."""
    assignments = json.loads((FIXTURES / "assignments_null_due_at.json").read_text())
    svc, session = _make_service_with_empty_existing()

    new_count = await svc.aggregate_and_dedup(
        course=_make_course(),
        canvas_assignments=assignments,
        ed_lessons_data=[],
        ed_discussion_texts=[],
    )

    # Exactly 3 items (the ones with real due_at), not 1 (collapsed) and not 5 (including nulls).
    assert new_count == 3
    # 1 SELECT + 3 INSERTs = 4 execute calls. If the bug were present, the two
    # null-due_at items would still raise inside fromisoformat and be caught by
    # the try/except, so count would drop to 3 anyway — but before the fix, the
    # str(None) == "None" passed the truthy guard, entered the fromisoformat
    # block, and the ValueError path was hit. The explicit isinstance guard now
    # short-circuits BEFORE fromisoformat, so only 3 inserts happen.
    assert session.execute.await_count == 1 + 3


@pytest.mark.asyncio
async def test_non_string_due_at_skipped() -> None:
    """Non-string due_at (int, dict) is skipped gracefully, no exception raised."""
    assignments: list[dict[str, object]] = [
        {"id": 1, "name": "Assignment 1", "due_at": 12345, "points_possible": 20},
        {"id": 2, "name": "Assignment 2", "due_at": {"when": "later"}, "points_possible": 20},
        {"id": 3, "name": "Assignment 3", "due_at": "2026-04-20T23:59:00Z", "points_possible": 30},
    ]
    svc, _ = _make_service_with_empty_existing()

    new_count = await svc.aggregate_and_dedup(
        course=_make_course(),
        canvas_assignments=assignments,
        ed_lessons_data=[],
        ed_discussion_texts=[],
    )

    # Only the valid ISO string flows through.
    assert new_count == 1


@pytest.mark.asyncio
async def test_empty_string_due_at_skipped() -> None:
    """Empty-string due_at is skipped (empty string is not a valid ISO date)."""
    assignments: list[dict[str, object]] = [
        {"id": 1, "name": "Assignment 1", "due_at": "", "points_possible": 20},
        {"id": 2, "name": "Assignment 2", "due_at": "2026-03-15T23:59:00Z", "points_possible": 30},
    ]
    svc, _ = _make_service_with_empty_existing()

    new_count = await svc.aggregate_and_dedup(
        course=_make_course(),
        canvas_assignments=assignments,
        ed_lessons_data=[],
        ed_discussion_texts=[],
    )

    assert new_count == 1


@pytest.mark.asyncio
async def test_only_null_due_at_emits_zero_deadlines() -> None:
    """All-null due_at returns 0, no exception raised, no INSERTs issued."""
    assignments: list[dict[str, object]] = [
        {"id": 1, "name": "Assignment 1", "due_at": None, "points_possible": 20},
        {"id": 2, "name": "Assignment 2", "due_at": None, "points_possible": 20},
        {"id": 3, "name": "Assignment 3", "due_at": None, "points_possible": 20},
    ]
    svc, session = _make_service_with_empty_existing()

    new_count = await svc.aggregate_and_dedup(
        course=_make_course(),
        canvas_assignments=assignments,
        ed_lessons_data=[],
        ed_discussion_texts=[],
    )

    assert new_count == 0
    # Only the initial SELECT existing; no INSERT calls.
    assert session.execute.await_count == 1
