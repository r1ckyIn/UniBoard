"""Integration harness for real-data sync validation.

Gated behind SYNC_REAL_DATA_CANVAS_TOKEN + SYNC_REAL_DATA_ED_TOKEN env vars.
Skipped in CI unless the developer opts in via env. Populated by Wave 3
(Plan 32.1-05) — Task 2a authors the smoke test, Task 2b authors the four
per-SYNC-FIX assertion tests.

The sync pipeline functions (``sync_all_courses``, ``sync_all_grades``,
``sync_all_deadlines``) take no arguments and iterate ALL users with
encrypted tokens in the database. The ``real_data_user`` fixture (in
tests/integration/conftest.py) commits a dedicated Profile row so the
pipeline discovers and processes it during the test.
"""
from __future__ import annotations

import os

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.skipif(
    not os.getenv("SYNC_REAL_DATA_CANVAS_TOKEN"),
    reason="Real-data integration requires SYNC_REAL_DATA_CANVAS_TOKEN env var",
)


@pytest.mark.asyncio
async def test_full_sync_completes_without_errors(
    real_data_user: object, session: AsyncSession
) -> None:
    """Smoke test: full sync pipeline completes without raising.

    Validates that the ``real_data_user`` fixture wiring + the sync entry-point
    import graph + Canvas/Ed token decryption all work end-to-end with real
    sandbox tokens. Per-fix assertions land in the four tests below.
    """
    from src.sync.courses import sync_all_courses

    await sync_all_courses()
    # No DB-state assertion here -- the four tests below each assert one
    # SYNC-FIX truth against the DB rows the sync just produced.


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
    """After sync_all_deadlines, at least 1 course has > 1 deadline row."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")


@pytest.mark.asyncio
async def test_ed_link_populated() -> None:
    """After sync_all_courses + link_courses, courses.ed_course_id IS NOT NULL for >=1 row."""
    pytest.skip("Wave 3: populated by Plan 32.1-05")
