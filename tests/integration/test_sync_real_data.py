"""Integration harness for real-data sync validation.

Gated behind SYNC_REAL_DATA_CANVAS_TOKEN + SYNC_REAL_DATA_ED_TOKEN env vars.
Skipped in CI unless the developer opts in via env. Populated by Wave 3
(Plan 32.1-05) — each test covers one SYNC-FIX-NN truth against a real
Canvas+Ed sandbox account.

The sync pipeline functions (``sync_all_courses``, ``sync_all_grades``,
``sync_all_deadlines``) take no arguments and iterate ALL users with
encrypted tokens in the database. The ``real_data_user`` fixture (in
tests/integration/conftest.py) commits a dedicated Profile row so the
pipeline discovers and processes it during the test. The first test
(``test_unit_outline_url_populated``) doubles as a smoke test: calling
``sync_all_courses()`` and asserting against the DB validates the entire
import graph + fixture wiring + token decryption + Canvas/Ed HTTP + DB
write path in a single invocation.
"""
from __future__ import annotations

import os

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.grade import Grade
from src.models.user import Profile

pytestmark = pytest.mark.skipif(
    not os.getenv("SYNC_REAL_DATA_CANVAS_TOKEN"),
    reason="Real-data integration requires SYNC_REAL_DATA_CANVAS_TOKEN env var",
)


@pytest.mark.asyncio
async def test_unit_outline_url_populated(
    real_data_user: Profile, session: AsyncSession
) -> None:
    """SYNC-FIX-01: After sync_all_courses, at least 1 course has unit_outline_url set.

    Also serves as the pipeline smoke test: if ``sync_all_courses()`` raises,
    this test fails before the assertion runs, which implicates the fixture
    wiring, Canvas adapter, Ed adapter, or token decryption.
    """
    from src.sync.courses import sync_all_courses

    await sync_all_courses()
    result = await session.execute(
        select(func.count(Course.id)).where(
            Course.user_id == real_data_user.id,
            Course.unit_outline_url.isnot(None),
        )
    )
    count = result.scalar_one()
    assert count >= 1, "SYNC-FIX-01 regression: no unit_outline_url populated"


@pytest.mark.asyncio
async def test_grade_score_populated(
    real_data_user: Profile, session: AsyncSession
) -> None:
    """SYNC-FIX-02: After sync_all_grades, at least 1 grade has non-null score."""
    from src.sync.courses import sync_all_courses
    from src.sync.grades import sync_all_grades

    await sync_all_courses()
    await sync_all_grades()
    # Join grades -> courses to scope by user_id (Grade has no user_id column).
    result = await session.execute(
        select(func.count(Grade.id))
        .join(Course, Course.id == Grade.course_id)
        .where(
            Course.user_id == real_data_user.id,
            Grade.score.isnot(None),
        )
    )
    count = result.scalar_one()
    assert count >= 1, "SYNC-FIX-02 regression: no grades.score populated"


@pytest.mark.asyncio
async def test_ed_link_populated(
    real_data_user: Profile, session: AsyncSession
) -> None:
    """SYNC-FIX-03: After sync_all_courses + link_courses, >=1 course.ed_course_id set."""
    from src.sync.courses import sync_all_courses

    await sync_all_courses()
    result = await session.execute(
        select(func.count(Course.id)).where(
            Course.user_id == real_data_user.id,
            Course.ed_course_id.isnot(None),
        )
    )
    count = result.scalar_one()
    assert count >= 1, "SYNC-FIX-03 regression: no courses.ed_course_id populated"


@pytest.mark.asyncio
async def test_deadline_completeness(
    real_data_user: Profile, session: AsyncSession
) -> None:
    """SYNC-FIX-04: After sync_all_deadlines, at least 1 course has > 1 deadline row."""
    from src.sync.courses import sync_all_courses
    from src.sync.deadlines import sync_all_deadlines

    await sync_all_courses()
    await sync_all_deadlines()
    # UnifiedDeadline has course_id but no user_id; join through Course.
    result = await session.execute(
        select(
            UnifiedDeadline.course_id,
            func.count(UnifiedDeadline.id).label("cnt"),
        )
        .join(Course, Course.id == UnifiedDeadline.course_id)
        .where(Course.user_id == real_data_user.id)
        .group_by(UnifiedDeadline.course_id)
    )
    rows = result.all()
    assert any(r.cnt > 1 for r in rows), (
        "SYNC-FIX-04 regression: no course has multiple deadlines"
    )


@pytest.mark.asyncio
async def test_shell_courses_filtered(
    real_data_user: Profile, session: AsyncSession
) -> None:
    """SYNC-FIX-05: After sync_all_courses, zero rows match shell-course name patterns."""
    from src.sync.courses import sync_all_courses

    await sync_all_courses()
    result = await session.execute(
        select(func.count(Course.id)).where(
            Course.user_id == real_data_user.id,
            text(
                "(name ILIKE 'Final Exam for:%' "
                "OR name ILIKE '%concession%' "
                "OR name ILIKE 'Supplementary%')"
            ),
        )
    )
    count = result.scalar_one()
    assert count == 0, "SYNC-FIX-05 regression: shell course leaked"
