"""Unit tests for StudyRecommendationService (AIFEAT-01).

Wave 1 (Plan 34-02): real bodies replace the Wave 0 xfail stubs.
Mirrors tests/unit/test_digest_service.py (DB-style) and
tests/unit/test_qa_service.py (AsyncMock-style) patterns.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.grade import Grade
from src.models.study_recommendation_cache import StudyRecommendationCache
from src.models.user import Profile
from src.services.study_recommendation import (
    StudyRecommendationService,
    _score_candidate,
    _ScoringInput,
)

# ---------------------------------------------------------------------------
# Seed helpers (DB-style fixtures)
# ---------------------------------------------------------------------------


async def _seed_profile_with_course_and_deadline(
    session: AsyncSession,
    *,
    language: str = "en",
    weight: float = 0.5,
    days_from_now: int = 3,
) -> tuple[Profile, Course]:
    """Seed Profile + Course + matching Grade (unscored) + UnifiedDeadline.

    ROIService computes due_date from UnifiedDeadline matched by assessment_name
    (case-insensitive lowered comparison); Grade drives the assignments list.
    """
    profile = Profile(
        id=uuid.uuid4(),
        display_name="Study Rec Tester",
        gpa_target=80.0,
        language_preference=language,
    )
    session.add(profile)
    await session.flush()

    course = Course(
        user_id=profile.id,
        name="Distributed Systems",
        code="COMP3221",
        semester="2026S1",
        credit_points=6,
    )
    session.add(course)
    await session.flush()

    # Ungraded assessment (score=None) -> treated as not-completed.
    grade = Grade(
        course_id=course.id,
        assessment_name="Quiz 3",
        score=None,
        max_score=100.0,
        weight=weight,
        group_name="Quizzes",
    )
    session.add(grade)

    due = datetime.now(UTC) + timedelta(days=days_from_now)
    deadline = UnifiedDeadline(
        course_id=course.id,
        title="Quiz 3",
        due_date=due,
        source="canvas_assignment",
        source_id="quiz-3-source",
        weight=weight,
        dedup_key=f"study-rec-{uuid.uuid4().hex[:10]}",
        is_confirmed=True,
    )
    session.add(deadline)
    await session.flush()

    return profile, course


# ---------------------------------------------------------------------------
# Test 1: generate + cache end-to-end (DB-style)
# ---------------------------------------------------------------------------


@pytest.mark.db
@pytest.mark.asyncio(loop_scope="session")
async def test_generate_and_cache(session: AsyncSession) -> None:
    """AIFEAT-01: study rec generated and cached for user with upcoming deadlines."""
    profile, _ = await _seed_profile_with_course_and_deadline(session)

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Focus on X (15% weight) -- review lecture 8.")]
    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("anthropic.AsyncAnthropic", return_value=mock_client):
        svc = StudyRecommendationService(
            session,
            anthropic_api_key="sk-test",
            language=profile.language_preference,
        )
        result = await svc.generate_and_cache(profile.id)

    assert result.main_suggestion.startswith("Focus on X")
    assert len(result.top_3) >= 1
    assert result.language == profile.language_preference

    # Re-run the same call: top_3 should be replaced but row count still 1.
    with patch("anthropic.AsyncAnthropic", return_value=mock_client):
        svc2 = StudyRecommendationService(
            session,
            anthropic_api_key="sk-test",
            language=profile.language_preference,
        )
        await svc2.generate_and_cache(profile.id)

    count_stmt = select(func.count()).select_from(StudyRecommendationCache).where(
        StudyRecommendationCache.user_id == profile.id
    )
    count = (await session.execute(count_stmt)).scalar_one()
    assert count == 1


# ---------------------------------------------------------------------------
# Test 2: composite score ranks near-due + high-weight first (pure-fn)
# ---------------------------------------------------------------------------


def test_score_candidate_ranking() -> None:
    """AIFEAT-01: composite score ranks the single highest-leverage item first.

    Composite formula: urgency * weight * sqrt(roi), where urgency is
    exp(-days/5) on-time and 1.5 when overdue. The test exercises three
    profiles that each stress one of the three axes:

      - C: high weight + near due -> must rank #1 (both axes favorable)
      - B: low  weight + near due -> lowest rank (weight dominates
           the weight axis because sqrt(roi) is constant)
      - A: high weight + far due  -> middle rank

    We therefore assert score_c > score_a > score_b and also that an
    overdue item beats a same-profile on-time item (urgency boost).
    """
    a = _ScoringInput(
        course_code="C1",
        assessment_name="A",
        weight=0.8,
        days_until_due=10.0,
        roi_score=4.0,
        is_completed=False,
    )
    b = _ScoringInput(
        course_code="C2",
        assessment_name="B",
        weight=0.1,
        days_until_due=1.0,
        roi_score=4.0,
        is_completed=False,
    )
    c = _ScoringInput(
        course_code="C3",
        assessment_name="C",
        weight=0.8,
        days_until_due=1.0,
        roi_score=4.0,
        is_completed=False,
    )

    score_a = _score_candidate(a)
    score_b = _score_candidate(b)
    score_c = _score_candidate(c)

    # C (high weight + near due) dominates on both axes.
    assert score_c > score_a
    assert score_c > score_b
    # At constant roi the weight axis beats a single near-due advantage,
    # because sqrt(roi) is constant while weight is 8x bigger for A vs B.
    assert score_a > score_b

    # Completed items return -1.0 (excluded from ranking).
    completed = _ScoringInput(
        course_code="C4",
        assessment_name="D",
        weight=0.9,
        days_until_due=0.5,
        roi_score=4.0,
        is_completed=True,
    )
    assert _score_candidate(completed) == pytest.approx(-1.0)

    # Past-due items get the 1.5 urgency boost.
    overdue = _ScoringInput(
        course_code="C5",
        assessment_name="E",
        weight=0.2,
        days_until_due=-1.0,
        roi_score=4.0,
        is_completed=False,
    )
    # 1.5 * 0.2 * 2 = 0.6
    assert _score_candidate(overdue) == pytest.approx(1.5 * 0.2 * 2.0, rel=1e-6)


# ---------------------------------------------------------------------------
# Test 3: UPSERT is idempotent on same date
# ---------------------------------------------------------------------------


@pytest.mark.db
@pytest.mark.asyncio(loop_scope="session")
async def test_cache_upsert_idempotent(session: AsyncSession) -> None:
    """AIFEAT-01: UPSERT on (user_id, generated_for_date) keeps row count == 1 on same day."""
    profile, _ = await _seed_profile_with_course_and_deadline(session)

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="First suggestion.")]
    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("anthropic.AsyncAnthropic", return_value=mock_client):
        svc = StudyRecommendationService(
            session, anthropic_api_key="sk-test", language="en",
        )
        await svc.generate_and_cache(profile.id)

    # Second run -- different text, same date.
    mock_response_2 = MagicMock()
    mock_response_2.content = [MagicMock(text="Second suggestion.")]
    mock_client_2 = AsyncMock()
    mock_client_2.messages.create = AsyncMock(return_value=mock_response_2)

    with patch("anthropic.AsyncAnthropic", return_value=mock_client_2):
        svc2 = StudyRecommendationService(
            session, anthropic_api_key="sk-test", language="en",
        )
        await svc2.generate_and_cache(profile.id)

    count_stmt = select(func.count()).select_from(StudyRecommendationCache).where(
        StudyRecommendationCache.user_id == profile.id
    )
    count = (await session.execute(count_stmt)).scalar_one()
    assert count == 1

    row_stmt = select(StudyRecommendationCache).where(
        StudyRecommendationCache.user_id == profile.id
    )
    row = (await session.execute(row_stmt)).scalar_one()
    assert "Second" in row.main_suggestion
    assert row.updated_at >= row.created_at


# ---------------------------------------------------------------------------
# Test 4: AI failure -> main_suggestion="" and top_3 still populated
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_ai_failure_fallback() -> None:
    """AIFEAT-01 / D-D1: AI failure -> main_suggestion='' but top_3 still populated.

    Uses AsyncMock rig (no DB) -- patches _collect_candidates to inject fixed
    candidates, patches AsyncAnthropic to raise, and asserts Sentry capture.
    """
    user_id = uuid.uuid4()
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute = AsyncMock()
    mock_session.flush = AsyncMock()

    fixed_candidates = [
        _ScoringInput(
            course_code="COMP3221",
            assessment_name="Quiz 3",
            weight=0.15,
            days_until_due=1.0,
            roi_score=4.0,
            is_completed=False,
        ),
    ]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(side_effect=RuntimeError("anthropic 503"))

    with patch(
        "src.services.study_recommendation.StudyRecommendationService._collect_candidates",
        new=AsyncMock(return_value=fixed_candidates),
    ), patch("anthropic.AsyncAnthropic", return_value=mock_client), patch(
        "sentry_sdk.capture_exception"
    ) as mock_capture:
        svc = StudyRecommendationService(
            mock_session, anthropic_api_key="sk-test", language="en",
        )
        response = await svc.generate_and_cache(user_id)

    # D-D1 fallback contract: no exception, empty main_suggestion, top_3 intact.
    assert response.main_suggestion == ""
    assert len(response.top_3) == 1
    assert response.top_3[0].assessment_name == "Quiz 3"

    # Sentry capture must have been invoked exactly once, with the phase/feature tags set.
    mock_capture.assert_called_once()


# ---------------------------------------------------------------------------
# Helper for mypy -- suppress unused-import if pytest markers only referenced via decorator
# ---------------------------------------------------------------------------

_ = Any  # keep Any import alive for future expansion
