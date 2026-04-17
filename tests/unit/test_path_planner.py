"""Unit tests for GPAService.calculate_multi_course_path (AIFEAT-03).

Phase 34 Wave 1 (Plan 34-03) flips the Wave 0 xfail stubs to real bodies.
Tests seed Profiles + Courses + Grades such that summary.cumulative_wam and
summary.total_credit_points match the expected values for closed-form math.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.grade import Grade
from src.models.user import Profile
from src.services.gpa import GPAService

# ---------------------------------------------------------------------------
# Seed helpers -- mirror tests/unit/test_gpa_service.py pattern
# ---------------------------------------------------------------------------


async def _seed_profile_with_wam(
    session: AsyncSession,
    *,
    current_wam: float,
    cp_done: int,
) -> Profile:
    """Seed a Profile + one Course + one Grade such that
    summary.cumulative_wam == current_wam and summary.total_credit_points == cp_done.

    We use a single course of `cp_done` credit points with one assessment
    (weight=1.0, score=current_wam, max_score=100). That yields a course WAM
    equal to current_wam and cumulative WAM == course WAM (only one course).
    """
    profile = Profile(id=uuid.uuid4(), display_name="Path Tester")
    session.add(profile)
    await session.flush()

    course = Course(
        user_id=profile.id,
        name="Seed Course",
        code="SEED1001",
        semester="2026S1",
        credit_points=cp_done,
    )
    session.add(course)
    await session.flush()

    grade = Grade(
        course_id=course.id,
        assessment_name="Seed Assessment",
        score=current_wam,
        max_score=100.0,
        weight=1.0,
        group_name="Assessments",
    )
    session.add(grade)
    await session.flush()
    return profile


# ---------------------------------------------------------------------------
# Tests -- closed-form math per plan 34-03 behavior block
# ---------------------------------------------------------------------------


@pytest.mark.db
@pytest.mark.asyncio
async def test_required_avg_math(session: AsyncSession) -> None:
    """AIFEAT-03: target=78, current=75, cp_done=72, cp_remain=72.

    Required avg = (78 * 144 - 75 * 72) / 72 = (11232 - 5400) / 72 = 81.0.
    """
    user = await _seed_profile_with_wam(session, current_wam=75.0, cp_done=72)
    svc = GPAService(session, anthropic_api_key="", language="en")
    result = await svc.calculate_multi_course_path(
        user.id, target_wam=78.0, remaining_credit_points=72,
    )
    assert result.is_achievable is True
    assert result.required_avg is not None
    assert result.required_avg == pytest.approx(81.0, abs=0.01)
    assert result.advisory_text is None  # math-only: AI not called here
    assert result.suggested_target is None
    assert result.language == "en"


@pytest.mark.db
@pytest.mark.asyncio
async def test_unreachable_returns_suggestion(session: AsyncSession) -> None:
    """AIFEAT-03 / D-C3: HD=85 unreachable from current=60 -> suggested_target=75 (D).

    max_reachable = (60 * 72 + 100 * 72) / 144 = 80.0.
    Highest band < 85 with band <= 80 -> 75 (Distinction).
    """
    user = await _seed_profile_with_wam(session, current_wam=60.0, cp_done=72)
    svc = GPAService(session, anthropic_api_key="", language="en")
    result = await svc.calculate_multi_course_path(
        user.id, target_wam=85.0, remaining_credit_points=72,
    )
    assert result.is_achievable is False
    assert result.required_avg is None
    assert result.max_reachable == pytest.approx(80.0, abs=0.01)
    assert result.suggested_target is not None
    assert result.suggested_target == pytest.approx(75.0, abs=0.01)
    assert result.advisory_text is None


@pytest.mark.db
@pytest.mark.asyncio
async def test_zero_remaining(session: AsyncSession) -> None:
    """AIFEAT-03: cp_remain=0 -> required_avg=None; is_achievable=(current>=target).

    current_wam=72, target=75 -> is_achievable=False, max_reachable=current=72.
    """
    user = await _seed_profile_with_wam(session, current_wam=72.0, cp_done=144)
    svc = GPAService(session, anthropic_api_key="", language="en")
    result = await svc.calculate_multi_course_path(
        user.id, target_wam=75.0, remaining_credit_points=0,
    )
    assert result.required_avg is None
    assert result.is_achievable is False  # 72 < 75
    assert result.max_reachable == pytest.approx(72.0, abs=0.01)
    assert result.suggested_target is None


@pytest.mark.db
@pytest.mark.asyncio
async def test_already_achieved(session: AsyncSession) -> None:
    """AIFEAT-03: current_wam (80) >= target (78) -> required_avg=0.0."""
    user = await _seed_profile_with_wam(session, current_wam=80.0, cp_done=72)
    svc = GPAService(session, anthropic_api_key="", language="en")
    result = await svc.calculate_multi_course_path(
        user.id, target_wam=78.0, remaining_credit_points=72,
    )
    assert result.is_achievable is True
    assert result.required_avg == 0.0
    # max_reachable = (80*72 + 100*72) / 144 = 90.0 -- well above target
    assert result.max_reachable >= 78.0
