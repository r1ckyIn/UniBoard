"""Unit tests for EdIntelligenceService AI thread evaluation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.schemas.ai import ThreadEvaluation
from src.schemas.intelligence import AIHighValuePostResponse


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

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[thread])))
    mock_session.execute = AsyncMock(return_value=mock_result)
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
    results = await svc.evaluate_new_threads_ai(
        user_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        ai_engine=mock_ai,
    )

    # Thread should have been scored
    assert thread.gpa_relevance_score == 0.9
    mock_ai.evaluate_thread.assert_called_once()
    # Result should contain the scored thread
    assert len(results) >= 1
    assert isinstance(results[0], AIHighValuePostResponse)


@pytest.mark.asyncio(loop_scope="session")
async def test_evaluate_threads_ai_fallback_on_failure() -> None:
    """When AI evaluation fails, thread stays at 0.0 (rule-engine fallback)."""
    from src.services.intelligence import EdIntelligenceService

    thread = _make_thread(gpa_relevance_score=0.0)

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[thread])))
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.flush = AsyncMock()

    mock_ai = AsyncMock()
    mock_ai.evaluate_thread = AsyncMock(side_effect=Exception("API Error"))

    svc = EdIntelligenceService(mock_session)
    results = await svc.evaluate_new_threads_ai(
        user_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        ai_engine=mock_ai,
    )

    # Thread should remain at 0.0
    assert thread.gpa_relevance_score == 0.0
    # No high-value posts returned (score 0.0 < 0.3 threshold)
    assert len(results) == 0
