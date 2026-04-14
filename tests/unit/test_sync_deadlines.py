"""Unit tests for DeadlineService.aggregate_and_dedup — SYNC-FIX-04 null due_at handling.

Stubs created in Wave 0. Wave 2 (Plan 32.1-04) fixes the str(None) bug.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.services.deadline import DeadlineService

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


@pytest.mark.asyncio
@pytest.mark.xfail(reason="Wave 2: aggregate_and_dedup drops all non-null due_at items due to str(None) bug", strict=False)
async def test_null_due_at_handling() -> None:
    """Given 5 assignments (3 with due_at, 2 with null), aggregator emits 3 deadlines (not 1, not 5)."""
    assignments = json.loads((FIXTURES / "assignments_null_due_at.json").read_text())
    svc = DeadlineService()  # type: ignore[call-arg]
    deadlines = await svc.aggregate_and_dedup(
        canvas_assignments=assignments,
        ed_lessons=[],
        ed_discussions=[],
        course_code="COMP2017",
        course_id="course-uuid",
    )
    # Exactly 3 items (the ones with real due_at), not 1 (collapsed) and not 5 (including nulls).
    assert len(deadlines) == 3
