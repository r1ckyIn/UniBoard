"""Unit tests for QAService with mocked AIEngine and session."""

from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.schemas.ai import QAResponse


def _make_mock_user(
    ai_calls_today: int = 0,
    ai_daily_limit: int = 100,
) -> MagicMock:
    """Build a mock User ORM instance."""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.ai_calls_today = ai_calls_today
    user.ai_calls_reset_date = datetime.utcnow()
    return user


def _make_mock_course(
    text_tokens: int = 5000,
) -> MagicMock:
    """Build a mock Course with modules and lessons that produce approx text_tokens tokens."""
    # Each word ~ 1 token roughly. Each item gets ~text_tokens/2 tokens worth of text.
    half = text_tokens // 2
    text = "word " * half

    course = MagicMock()
    course.id = uuid.uuid4()
    course.name = "Data Structures"

    module = MagicMock()
    module.name = "Week 1"
    item = MagicMock()
    item.title = "Lecture Notes"
    item.text_content = text
    module.items = [item]
    course.modules = [module]

    lesson = MagicMock()
    lesson.title = "Intro Lesson"
    lesson.text_content = text
    course.lessons = [lesson]

    return course


@pytest.mark.asyncio(loop_scope="session")
async def test_answer_question_direct_context_for_small_course() -> None:
    """QAService uses direct context path when total tokens < threshold."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.ask_question = AsyncMock(
        return_value=QAResponse(
            answer="The answer is 42 [Canvas: Lecture Notes].",
            citations=["[Canvas: Lecture Notes]"],
            method="direct_context",
            tokens_used=150,
        )
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    mock_course = _make_mock_course(text_tokens=5000)

    mock_session = AsyncMock()
    mock_session.get = AsyncMock(return_value=mock_user)

    # Mock the query that loads course with materials
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=mock_course)
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.flush = AsyncMock()

    svc = QAService(session=mock_session, ai_engine=mock_ai)
    result = await svc.answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="What is the answer?",
    )

    assert result.method == "direct_context"
    assert len(result.citations) >= 1
    mock_ai.ask_question.assert_called_once()


@pytest.mark.asyncio(loop_scope="session")
async def test_answer_question_respects_daily_limit() -> None:
    """QAService returns error when AI daily limit is exceeded."""
    from src.schemas.common import RateLimitedError
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_user = _make_mock_user(ai_calls_today=100)

    mock_session = AsyncMock()
    mock_session.get = AsyncMock(return_value=mock_user)

    svc = QAService(session=mock_session, ai_engine=mock_ai)

    with pytest.raises(RateLimitedError):
        await svc.answer_question(
            user_id=mock_user.id,
            course_id=uuid.uuid4(),
            question="What is the answer?",
        )

    # AI should NOT have been called
    mock_ai.ask_question.assert_not_called()
