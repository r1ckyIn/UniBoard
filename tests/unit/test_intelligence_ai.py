"""Unit tests for EdIntelligenceService AI thread evaluation."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.schemas.ai import ThreadEvaluation
from src.schemas.intelligence import AIHighValuePostResponse


def _make_mock_user(ai_calls_today: int = 0) -> MagicMock:
    """Build a mock User for AI rate limit checks."""
    user = MagicMock()
    user.ai_calls_today = ai_calls_today
    user.ai_calls_reset_date = None
    return user


def _make_mock_settings() -> MagicMock:
    """Build a mock Settings with default AI limits."""
    settings = MagicMock()
    settings.ai_daily_limit_per_user = 100
    return settings


def _make_thread(
    gpa_relevance_score: float = 0.0,
    is_endorsed: bool = False,
    is_staff_post: bool = False,
    title: str = "Test Thread",
    content: str = "Thread content",
    category: str = "General",
) -> MagicMock:
    """Build a mock DiscussionThread ORM instance."""
    thread = MagicMock()
    thread.id = uuid.uuid4()
    thread.ed_thread_id = str(uuid.uuid4().int)[:6]
    thread.title = title
    thread.content = content
    thread.category = category
    thread.is_endorsed = is_endorsed
    thread.is_staff_post = is_staff_post
    thread.gpa_relevance_score = gpa_relevance_score
    thread.created_at = MagicMock()
    thread.created_at.isoformat = MagicMock(return_value="2026-03-17T00:00:00")
    return thread


@pytest.mark.asyncio(loop_scope="session")
async def test_evaluate_new_threads_updates_scores() -> None:
    """evaluate_new_threads_ai updates gpa_relevance_score for unscored threads."""
    from src.services.intelligence import EdIntelligenceService

    thread = _make_thread(gpa_relevance_score=0.0, title="Exam Hints")

    mock_user = _make_mock_user(ai_calls_today=0)

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[thread])))
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.get = AsyncMock(return_value=mock_user)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(
        return_value=ThreadEvaluation(
            gpa_relevance=0.9,
            category="exam_info",
            summary="Contains exam hints",
            urgency="critical",
            key_facts=["Exam covers chapters 1-5"],
        )
    )

    svc = EdIntelligenceService(mock_session)
    with patch("src.services.intelligence.get_settings", return_value=_make_mock_settings()):
        results = await svc.evaluate_new_threads_ai(
            user_id=uuid.uuid4(),
            course_id=uuid.uuid4(),
            ai_engine=mock_ai,
        )

    # Thread should have been scored
    assert thread.gpa_relevance_score == 0.9
    mock_ai.evaluate_thread.assert_called_once()
    # AI calls should have been incremented
    assert mock_user.ai_calls_today == 1
    # Result should contain the scored thread
    assert len(results) >= 1
    assert isinstance(results[0], AIHighValuePostResponse)


@pytest.mark.asyncio(loop_scope="session")
async def test_evaluate_threads_ai_fallback_on_failure() -> None:
    """When AI evaluation fails, thread stays at 0.0 (rule-engine fallback)."""
    from src.services.intelligence import EdIntelligenceService

    thread = _make_thread(gpa_relevance_score=0.0)

    mock_user = _make_mock_user(ai_calls_today=0)

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[thread])))
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.get = AsyncMock(return_value=mock_user)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(side_effect=Exception("API Error"))

    svc = EdIntelligenceService(mock_session)
    with patch("src.services.intelligence.get_settings", return_value=_make_mock_settings()):
        results = await svc.evaluate_new_threads_ai(
            user_id=uuid.uuid4(),
            course_id=uuid.uuid4(),
            ai_engine=mock_ai,
        )

    # Thread should remain at 0.0
    assert thread.gpa_relevance_score == 0.0
    # No high-value posts returned (score 0.0 < 0.3 threshold)
    assert len(results) == 0


@pytest.mark.asyncio(loop_scope="session")
async def test_batch_limit_20_threads() -> None:
    """evaluate_new_threads_ai processes at most 20 threads (D-07 batch limit)."""
    from src.services.intelligence import EdIntelligenceService

    # Create 30 unscored threads
    threads = [_make_thread(gpa_relevance_score=0.0, title=f"Thread {i}") for i in range(30)]

    mock_user = _make_mock_user(ai_calls_today=0)

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(
        return_value=MagicMock(all=MagicMock(return_value=threads))
    )
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.get = AsyncMock(return_value=mock_user)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(
        return_value=ThreadEvaluation(
            gpa_relevance=0.8,
            category="exam_info",
            summary="Relevant",
            urgency="important",
            key_facts=["Fact"],
        )
    )

    settings = _make_mock_settings()
    settings.ai_daily_limit_per_user = 100  # Daily limit >> batch limit

    svc = EdIntelligenceService(mock_session)
    with patch("src.services.intelligence.get_settings", return_value=settings):
        await svc.evaluate_new_threads_ai(
            user_id=uuid.uuid4(),
            course_id=uuid.uuid4(),
            ai_engine=mock_ai,
        )

    # Only first 20 should be evaluated (batch limit)
    assert mock_ai.evaluate_thread.call_count == 20


@pytest.mark.asyncio(loop_scope="session")
async def test_daily_counter_reset_stale_date() -> None:
    """Daily counter resets when ai_calls_reset_date is before today."""
    from src.services.intelligence import EdIntelligenceService

    threads = [_make_thread(gpa_relevance_score=0.0)]

    mock_user = _make_mock_user(ai_calls_today=50)
    # Set reset date to yesterday
    mock_user.ai_calls_reset_date = datetime(2026, 3, 27)

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(
        return_value=MagicMock(all=MagicMock(return_value=threads))
    )
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.get = AsyncMock(return_value=mock_user)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(
        return_value=ThreadEvaluation(
            gpa_relevance=0.7,
            category="general",
            summary="Thread",
            urgency="informational",
            key_facts=[],
        )
    )

    settings = _make_mock_settings()
    svc = EdIntelligenceService(mock_session)
    with patch("src.services.intelligence.get_settings", return_value=settings):
        await svc.evaluate_new_threads_ai(
            user_id=uuid.uuid4(),
            course_id=uuid.uuid4(),
            ai_engine=mock_ai,
        )

    # Counter should have been reset to 0 + 1 new call
    assert mock_user.ai_calls_today == 1
    # evaluate_thread should have been called (counter was reset so quota available)
    mock_ai.evaluate_thread.assert_called_once()


@pytest.mark.asyncio(loop_scope="session")
async def test_daily_counter_no_reset_today() -> None:
    """Daily counter does NOT reset when ai_calls_reset_date is today."""
    from src.services.intelligence import EdIntelligenceService

    threads = [_make_thread(gpa_relevance_score=0.0)]

    mock_user = _make_mock_user(ai_calls_today=5)
    # Set reset date to today
    mock_user.ai_calls_reset_date = datetime.combine(date.today(), datetime.min.time())

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(
        return_value=MagicMock(all=MagicMock(return_value=threads))
    )
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.get = AsyncMock(return_value=mock_user)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(
        return_value=ThreadEvaluation(
            gpa_relevance=0.6,
            category="general",
            summary="Thread",
            urgency="informational",
            key_facts=[],
        )
    )

    settings = _make_mock_settings()
    svc = EdIntelligenceService(mock_session)
    with patch("src.services.intelligence.get_settings", return_value=settings):
        await svc.evaluate_new_threads_ai(
            user_id=uuid.uuid4(),
            course_id=uuid.uuid4(),
            ai_engine=mock_ai,
        )

    # Counter should NOT have been reset -- should be 5 + 1 = 6
    assert mock_user.ai_calls_today == 6


@pytest.mark.asyncio(loop_scope="session")
async def test_batch_limit_vs_daily_limit() -> None:
    """Daily limit takes precedence when remaining quota < batch limit (20)."""
    from src.services.intelligence import EdIntelligenceService

    # Create 30 unscored threads
    threads = [_make_thread(gpa_relevance_score=0.0, title=f"Thread {i}") for i in range(30)]

    mock_user = _make_mock_user(ai_calls_today=92)
    # Set reset date to today so counter is NOT reset
    mock_user.ai_calls_reset_date = datetime.combine(date.today(), datetime.min.time())

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(
        return_value=MagicMock(all=MagicMock(return_value=threads))
    )
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.get = AsyncMock(return_value=mock_user)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(
        return_value=ThreadEvaluation(
            gpa_relevance=0.5,
            category="general",
            summary="Thread",
            urgency="informational",
            key_facts=[],
        )
    )

    settings = _make_mock_settings()
    settings.ai_daily_limit_per_user = 100  # 100 - 92 = 8 remaining < 20 batch limit

    svc = EdIntelligenceService(mock_session)
    with patch("src.services.intelligence.get_settings", return_value=settings):
        await svc.evaluate_new_threads_ai(
            user_id=uuid.uuid4(),
            course_id=uuid.uuid4(),
            ai_engine=mock_ai,
        )

    # Only 8 should be evaluated (daily limit remaining < batch limit)
    assert mock_ai.evaluate_thread.call_count == 8
