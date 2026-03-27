"""Unit tests for DigestService -- rule-based collection and AI enhancement."""

import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.grade import Grade
from src.models.user import Profile


async def _create_profile_with_data(session: AsyncSession) -> Profile:
    """Create profile with course, recent grade, and upcoming deadline."""
    profile = Profile(
        id=uuid.uuid4(),
        display_name="Digest Tester",
        gpa_target=80.0,
    )
    session.add(profile)
    await session.flush()

    course = Course(
        user_id=profile.id,
        name="Systems Programming",
        code="COMP2017",
        semester="2026S1",
        credit_points=6,
    )
    session.add(course)
    await session.flush()

    # Recent grade (graded in last 24h)
    grade = Grade(
        course_id=course.id,
        assessment_name="Assignment 1",
        score=85.0,
        max_score=100.0,
        weight=0.3,
        group_name="Assignments",
        graded_at=datetime.utcnow() - timedelta(hours=2),  # noqa: DTZ003
    )
    session.add(grade)

    # Upcoming deadline (within 7 days)
    deadline = UnifiedDeadline(
        course_id=course.id,
        title="Assignment 2",
        due_date=datetime.utcnow() + timedelta(days=3),  # noqa: DTZ003
        source="canvas_assignment",
        source_id="12345",
        weight=0.3,
        dedup_key=f"test-dedup-{uuid.uuid4().hex[:8]}",
        is_confirmed=True,
    )
    session.add(deadline)
    await session.flush()

    return profile


# ---------------------------------------------------------------------------
# Test 6: rule-based digest collects grades/deadlines/posts from last 24h
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_rule_based_digest(session: AsyncSession) -> None:
    """DigestService generates digest with grades and deadlines from last 24h."""
    from src.services.digest import DigestService

    user = await _create_profile_with_data(session)

    svc = DigestService(session, anthropic_api_key="")
    result = await svc.generate_digest(user.id)

    assert result is not None
    assert result.digest_date is not None
    # Should have at least items from the grade and deadline we created
    assert len(result.items) >= 1


# ---------------------------------------------------------------------------
# Test 7: AI enhancement adds urgency_score and ai_summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_enhance_with_ai(session: AsyncSession) -> None:
    """AI enhancement adds urgency_score (1-5) and ai_summary to digest."""
    from src.services.digest import DigestService

    user = await _create_profile_with_data(session)

    # Mock AIEngine for urgency scoring
    mock_ai_engine = AsyncMock()
    mock_ai_engine.score_urgency = AsyncMock(
        return_value=[
            {"index": 0, "urgency_score": 4, "reason": "Due soon"},
            {"index": 1, "urgency_score": 3, "reason": "Upcoming"},
        ]
    )

    # Mock AsyncAnthropic for summary generation (used inside _generate_summary)
    mock_summary_response = MagicMock()
    mock_summary_response.content = [
        MagicMock(text="Focus on Assignment 2 due in 3 days. Good score on Assignment 1.")
    ]
    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_summary_response)

    with patch("anthropic.AsyncAnthropic", return_value=mock_client):
        svc = DigestService(session, anthropic_api_key="test-key", ai_engine=mock_ai_engine)
        result = await svc.generate_digest(user.id)

    assert result is not None
    assert result.ai_summary is not None
    assert "Assignment" in result.ai_summary
