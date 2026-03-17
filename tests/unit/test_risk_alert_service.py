"""Unit tests for RiskAlertService -- risk detection, AI invocation, fallback."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.grade import Grade
from src.models.user import User
from src.security.password import hash_password


async def _create_user_with_grades(
    session: AsyncSession,
    *,
    gpa_target: float = 80.0,
    course_wam: float = 70.0,
) -> User:
    """Create user with gpa_target and a single course with known WAM."""
    user = User(
        email=f"risk-test-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Risk Tester",
        gpa_target=gpa_target,
    )
    session.add(user)
    await session.flush()

    course = Course(
        user_id=user.id,
        name="Systems Programming",
        code="COMP2017",
        semester="2026S1",
        credit_points=6,
    )
    session.add(course)
    await session.flush()

    grade = Grade(
        course_id=course.id,
        assessment_name="Final Exam",
        score=course_wam,
        max_score=100.0,
        weight=1.0,
        group_name="Exams",
    )
    session.add(grade)
    await session.flush()

    return user


# ---------------------------------------------------------------------------
# Test 4: check_risk returns alert when gap >= 5
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_risk_detected_when_gap_above_threshold(session: AsyncSession) -> None:
    """RiskAlertService detects risk when WAM gap >= 5 points from gpa_target."""
    from src.services.risk_alert import RiskAlertService

    # WAM=70, target=80 => gap=10 (>=5)
    user = await _create_user_with_grades(session, gpa_target=80.0, course_wam=70.0)

    # Use empty API key so AI call is skipped, forcing fallback
    svc = RiskAlertService(session, anthropic_api_key="")
    result = await svc.check_risk_for_user(user.id)

    assert result is not None
    assert result.gap >= 5.0
    assert result.severity in ("warning", "critical")


@pytest.mark.asyncio
async def test_no_risk_when_within_threshold(session: AsyncSession) -> None:
    """No alert when WAM gap < 5 points from target."""
    from src.services.risk_alert import RiskAlertService

    # WAM=78, target=80 => gap=2 (<5)
    user = await _create_user_with_grades(session, gpa_target=80.0, course_wam=78.0)

    svc = RiskAlertService(session, anthropic_api_key="")
    result = await svc.check_risk_for_user(user.id)

    assert result is None


# ---------------------------------------------------------------------------
# Test 5: AI invocation and fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_risk_alert_invokes_ai_for_deep_analysis(session: AsyncSession) -> None:
    """When risk detected and API key set, invokes Claude Opus 4.6 for analysis."""
    from src.services.risk_alert import RiskAlertService

    user = await _create_user_with_grades(session, gpa_target=85.0, course_wam=70.0)

    # Mock Anthropic client
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Focus on COMP2017 final exam preparation.")]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("src.services.risk_alert.AsyncAnthropic", return_value=mock_client):
        svc = RiskAlertService(session, anthropic_api_key="test-key")
        result = await svc.check_risk_for_user(user.id)

    assert result is not None
    assert "COMP2017" in result.recommendation or "Focus" in result.recommendation
    mock_client.messages.create.assert_called_once()


@pytest.mark.asyncio
async def test_risk_alert_falls_back_on_ai_failure(session: AsyncSession) -> None:
    """When AI call fails, recommendation uses rule-based fallback string."""
    from src.services.risk_alert import RiskAlertService

    user = await _create_user_with_grades(session, gpa_target=85.0, course_wam=70.0)

    # Mock Anthropic client that raises
    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(side_effect=Exception("API error"))

    with patch("src.services.risk_alert.AsyncAnthropic", return_value=mock_client):
        svc = RiskAlertService(session, anthropic_api_key="test-key")
        result = await svc.check_risk_for_user(user.id)

    assert result is not None
    # Fallback message contains WAM and target info
    assert "70.0" in result.recommendation or "below" in result.recommendation
    assert "85.0" in result.recommendation or "target" in result.recommendation
