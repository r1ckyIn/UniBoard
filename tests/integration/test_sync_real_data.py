"""Integration harness for real-data sync validation.

Gated behind SYNC_REAL_DATA_CANVAS_TOKEN + SYNC_REAL_DATA_ED_TOKEN env vars.
Skipped in CI unless the developer opts in via env. Populated by Wave 3 (Plan 32.1-05).
"""
from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("SYNC_REAL_DATA_CANVAS_TOKEN"),
    reason="Real-data integration requires SYNC_REAL_DATA_CANVAS_TOKEN env var",
)


@pytest.mark.asyncio
async def test_unit_outline_url_populated() -> None:
    """After sync_all_courses, courses.unit_outline_url IS NOT NULL for >=1 row."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")


@pytest.mark.asyncio
async def test_grade_score_populated() -> None:
    """After sync_all_grades, grades.score IS NOT NULL for graded submissions."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")


@pytest.mark.asyncio
async def test_deadline_completeness() -> None:
    """After sync_all_deadlines, COUNT(*) per course_id > 1 for courses with multiple assignments."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")


@pytest.mark.asyncio
async def test_ed_link_populated() -> None:
    """After sync_all_courses + link_courses, courses.ed_course_id IS NOT NULL for >=1 row."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")


@pytest.mark.asyncio
async def test_shell_courses_filtered() -> None:
    """No courses remain with name LIKE 'Final Exam for:%' or matching Concession regex."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")
