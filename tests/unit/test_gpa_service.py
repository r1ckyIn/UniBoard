"""Unit tests for GPAService -- Hypothesis property tests and scenario tests."""

import uuid
from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.grade import Grade
from src.models.user import Profile
from src.schemas.gpa import TargetRequest, WhatIfCreateRequest, WhatIfScore
from src.services.gpa import GPAService

# ---------------------------------------------------------------------------
# Hypothesis strategies
# ---------------------------------------------------------------------------

grade_strategy = st.tuples(
    st.decimals(
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        allow_nan=False,
        allow_infinity=False,
        places=2,
    ),
    st.integers(min_value=1, max_value=24),
)


# ---------------------------------------------------------------------------
# Hypothesis property tests (pure functions, no database)
# ---------------------------------------------------------------------------


@given(st.lists(grade_strategy, min_size=1, max_size=20))
@settings(max_examples=200)
def test_wam_always_between_0_and_100(
    grades: list[tuple[Decimal, int]],
) -> None:
    """WAM must always be in [0, 100] for any valid input."""
    courses = [(mark, Decimal(str(cp))) for mark, cp in grades]
    total_weighted = sum(mark * cp for mark, cp in courses)
    total_credits = sum(cp for _, cp in courses)
    if total_credits == 0:
        return
    from decimal import ROUND_HALF_UP

    wam = (total_weighted / total_credits).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    assert Decimal("0") <= wam <= Decimal("100")


@given(st.lists(grade_strategy, min_size=1, max_size=20))
@settings(max_examples=200)
def test_gpa_always_in_valid_set(
    grades: list[tuple[Decimal, int]],
) -> None:
    """GPA point must always be in {0, 4, 5, 6, 7} for any WAM."""
    from src.services.gpa import GPAService

    courses = [(mark, Decimal(str(cp))) for mark, cp in grades]
    total_weighted = sum(mark * cp for mark, cp in courses)
    total_credits = sum(cp for _, cp in courses)
    if total_credits == 0:
        return
    from decimal import ROUND_HALF_UP

    wam = (total_weighted / total_credits).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    band, gpa = GPAService._mark_to_grade_band(wam)
    assert gpa in (0, 4, 5, 6, 7)
    assert band in ("HD", "D", "CR", "P", "F")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


async def _create_test_profile(session: AsyncSession) -> Profile:
    """Create a test Profile (no auth.users dependency in unit tests)."""
    profile = Profile(
        id=uuid.uuid4(),
        display_name="GPA Tester",
    )
    session.add(profile)
    await session.flush()
    return profile


async def _create_course_with_grades(
    session: AsyncSession,
    user: Profile,
    *,
    code: str = "COMP2017",
    name: str = "Systems Programming",
    semester: str = "2026S1",
    credit_points: int = 6,
    grades_data: list[dict[str, float | str | None]] | None = None,
) -> Course:
    """Create a course with grade records and return it."""
    course = Course(
        user_id=user.id,
        name=name,
        code=code,
        semester=semester,
        credit_points=credit_points,
    )
    session.add(course)
    await session.flush()

    if grades_data:
        for gd in grades_data:
            grade = Grade(
                course_id=course.id,
                assessment_name=str(gd["name"]),
                score=gd.get("score"),  # type: ignore[arg-type]
                max_score=float(gd.get("max_score", 100)),
                weight=float(gd.get("weight", 0.25)),
                group_name=str(gd.get("group_name", "Assignments")),
            )
            session.add(grade)
        await session.flush()

    return course


# ---------------------------------------------------------------------------
# Scenario unit tests (real database)
# ---------------------------------------------------------------------------


@pytest.mark.db
@pytest.mark.asyncio
async def test_single_course_wam(session: AsyncSession) -> None:
    """One course with two graded assessments calculates correct WAM."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "Assignment 1", "score": 80, "max_score": 100, "weight": 0.30},
            {"name": "Final Exam", "score": 90, "max_score": 100, "weight": 0.70},
        ],
    )

    svc = GPAService(session)
    result = await svc.get_summary(user.id)
    assert result.course_count == 1
    # WAM = (80*0.30 + 90*0.70) / (0.30+0.70) * 1.0 = 24 + 63 / 1.0 = 87.0
    assert result.cumulative_wam == pytest.approx(87.0, abs=0.01)


@pytest.mark.db
@pytest.mark.asyncio
async def test_multi_course_cumulative_wam(session: AsyncSession) -> None:
    """Two courses with different credit points weighted correctly."""
    user = await _create_test_profile(session)
    # Course A: 6cp, WAM=80
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "Exam", "score": 80, "max_score": 100, "weight": 1.0},
        ],
    )
    # Course B: 6cp, WAM=90
    await _create_course_with_grades(
        session,
        user,
        code="COMP2123",
        name="Data Structures",
        credit_points=6,
        grades_data=[
            {"name": "Exam", "score": 90, "max_score": 100, "weight": 1.0},
        ],
    )

    svc = GPAService(session)
    result = await svc.get_summary(user.id)
    assert result.course_count == 2
    # WAM = (80*6 + 90*6) / (6+6) = 1020/12 = 85.00
    assert result.cumulative_wam == pytest.approx(85.0, abs=0.01)


@pytest.mark.db
@pytest.mark.asyncio
async def test_grade_band_boundaries(session: AsyncSession) -> None:
    """Test exact grade band boundary values."""
    # Use static helper directly
    assert GPAService._mark_to_grade_band(Decimal("85.00")) == ("HD", 7)
    assert GPAService._mark_to_grade_band(Decimal("84.99")) == ("D", 6)
    assert GPAService._mark_to_grade_band(Decimal("75.00")) == ("D", 6)
    assert GPAService._mark_to_grade_band(Decimal("74.99")) == ("CR", 5)
    assert GPAService._mark_to_grade_band(Decimal("65.00")) == ("CR", 5)
    assert GPAService._mark_to_grade_band(Decimal("64.99")) == ("P", 4)
    assert GPAService._mark_to_grade_band(Decimal("50.00")) == ("P", 4)
    assert GPAService._mark_to_grade_band(Decimal("49.99")) == ("F", 0)
    assert GPAService._mark_to_grade_band(Decimal("0")) == ("F", 0)
    assert GPAService._mark_to_grade_band(Decimal("100")) == ("HD", 7)


@pytest.mark.db
@pytest.mark.asyncio
async def test_ungraded_assessment_excluded(session: AsyncSession) -> None:
    """Assessments with score=None are excluded from WAM calculation."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "Assignment 1", "score": 80, "max_score": 100, "weight": 0.30},
            {"name": "Final Exam", "score": None, "max_score": 100, "weight": 0.70},
        ],
    )

    svc = GPAService(session)
    result = await svc.get_summary(user.id)
    assert result.course_count == 1
    # Only Assignment 1 is graded, course WAM should be based on score 80
    assert result.courses[0].wam == pytest.approx(80.0, abs=0.01)
    assert result.courses[0].graded_count == 1
    assert result.courses[0].assessment_count == 2


@pytest.mark.db
@pytest.mark.asyncio
async def test_pct_assessed_calculation(session: AsyncSession) -> None:
    """Verify pct_assessed reflects graded weight / total weight."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "A1", "score": 90, "max_score": 100, "weight": 0.20},
            {"name": "A2", "score": 85, "max_score": 100, "weight": 0.30},
            {"name": "Exam", "score": None, "max_score": 100, "weight": 0.50},
        ],
    )

    svc = GPAService(session)
    result = await svc.get_summary(user.id)
    # pct_assessed = (0.20 + 0.30) / (0.20 + 0.30 + 0.50) * 100 = 50.0
    assert result.courses[0].pct_assessed == pytest.approx(50.0, abs=0.01)


@pytest.mark.db
@pytest.mark.asyncio
async def test_whatif_simulate(session: AsyncSession) -> None:
    """Create a what-if scenario with hypothetical scores and verify recalculation."""
    user = await _create_test_profile(session)
    course = await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "A1", "score": 70, "max_score": 100, "weight": 0.30},
            {"name": "Exam", "score": None, "max_score": 100, "weight": 0.70},
        ],
    )

    # Load grades to get the exam assessment ID
    await session.refresh(course, attribute_names=["grades"])
    exam_grade = next(g for g in course.grades if g.assessment_name == "Exam")

    svc = GPAService(session)
    req = WhatIfCreateRequest(
        name="Optimistic",
        scores=[WhatIfScore(assessment_id=str(exam_grade.id), hypothetical_score=90)],
    )
    result = await svc.simulate(user.id, req)
    # With 70 * 0.30 + 90 * 0.70 = 21 + 63 = 84
    assert result.result_wam == pytest.approx(84.0, abs=0.01)
    assert result.name == "Optimistic"


@pytest.mark.db
@pytest.mark.asyncio
async def test_whatif_persistence(session: AsyncSession) -> None:
    """What-if scenarios are persisted and can be retrieved."""
    user = await _create_test_profile(session)
    course = await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "A1", "score": 80, "max_score": 100, "weight": 0.50},
            {"name": "Exam", "score": None, "max_score": 100, "weight": 0.50},
        ],
    )
    await session.refresh(course, attribute_names=["grades"])
    exam_grade = next(g for g in course.grades if g.assessment_name == "Exam")

    svc = GPAService(session)
    req = WhatIfCreateRequest(
        name="Scenario A",
        scores=[WhatIfScore(assessment_id=str(exam_grade.id), hypothetical_score=85)],
    )
    await svc.simulate(user.id, req)

    scenarios = await svc.list_scenarios(user.id)
    assert len(scenarios) >= 1
    assert any(s.name == "Scenario A" for s in scenarios)


@pytest.mark.db
@pytest.mark.asyncio
async def test_target_path_uniform_achievable(session: AsyncSession) -> None:
    """Target path uniform mode returns achievable scores <= 100."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "A1", "score": 80, "max_score": 100, "weight": 0.30},
            {"name": "A2", "score": None, "max_score": 100, "weight": 0.30},
            {"name": "Exam", "score": None, "max_score": 100, "weight": 0.40},
        ],
    )

    svc = GPAService(session)
    req = TargetRequest(target_wam=85.0, mode="uniform")
    result = await svc.calculate_target_path(user.id, req)
    assert result.is_achievable is True
    assert len(result.required_scores) == 2  # 2 ungraded assessments
    for rs in result.required_scores:
        assert rs.minimum_score <= 100.0


@pytest.mark.db
@pytest.mark.asyncio
async def test_target_path_unreachable(session: AsyncSession) -> None:
    """Target too high returns is_achievable=False with max_achievable_wam."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "A1", "score": 30, "max_score": 100, "weight": 0.50},
            {"name": "Exam", "score": None, "max_score": 100, "weight": 0.50},
        ],
    )

    svc = GPAService(session)
    req = TargetRequest(target_wam=99.0, mode="uniform")
    result = await svc.calculate_target_path(user.id, req)
    assert result.is_achievable is False
    # Max achievable: 30*0.50 + 100*0.50 = 65.0
    assert result.max_achievable_wam == pytest.approx(65.0, abs=0.01)


@pytest.mark.db
@pytest.mark.asyncio
async def test_trend_multiple_semesters(session: AsyncSession) -> None:
    """Trend returns chronologically ordered semester data."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP1511",
        name="Programming Fundamentals",
        semester="2025S1",
        credit_points=6,
        grades_data=[
            {"name": "Exam", "score": 75, "max_score": 100, "weight": 1.0},
        ],
    )
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        name="Systems Programming",
        semester="2025S2",
        credit_points=6,
        grades_data=[
            {"name": "Exam", "score": 85, "max_score": 100, "weight": 1.0},
        ],
    )
    await _create_course_with_grades(
        session,
        user,
        code="COMP2123",
        name="Data Structures",
        semester="2026S1",
        credit_points=6,
        grades_data=[
            {"name": "Exam", "score": 90, "max_score": 100, "weight": 1.0},
        ],
    )

    svc = GPAService(session)
    result = await svc.get_trend(user.id)
    assert len(result.semesters) == 3
    # Chronological order
    assert result.semesters[0].semester == "2025S1"
    assert result.semesters[1].semester == "2025S2"
    assert result.semesters[2].semester == "2026S1"
    # Cumulative WAM should increase
    assert result.semesters[0].cumulative_wam == pytest.approx(75.0, abs=0.01)
    assert result.semesters[1].cumulative_wam == pytest.approx(80.0, abs=0.01)
    assert result.semesters[2].cumulative_wam == pytest.approx(
        83.33, abs=0.01
    )


@pytest.mark.db
@pytest.mark.asyncio
async def test_empty_grades_returns_zero(session: AsyncSession) -> None:
    """No graded assessments returns WAM=0.00, GPA=0."""
    user = await _create_test_profile(session)
    await _create_course_with_grades(
        session,
        user,
        code="COMP2017",
        credit_points=6,
        grades_data=[
            {"name": "Exam", "score": None, "max_score": 100, "weight": 1.0},
        ],
    )

    svc = GPAService(session)
    result = await svc.get_summary(user.id)
    assert result.cumulative_wam == pytest.approx(0.0, abs=0.01)
    assert result.cumulative_gpa == pytest.approx(0.0, abs=0.01)
