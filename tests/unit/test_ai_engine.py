"""Unit tests for AIEngine with mocked Anthropic client."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.schemas.ai import QAResponse, ThreadEvaluation, UnitReviewResponse


def _make_mock_response(text: str) -> MagicMock:
    """Build a mock Anthropic messages.create() response."""
    content_block = MagicMock()
    content_block.text = text
    response = MagicMock()
    response.content = [content_block]
    response.usage = MagicMock(input_tokens=100, output_tokens=50)
    return response


@pytest.mark.asyncio(loop_scope="session")
async def test_evaluate_thread_returns_valid_evaluation() -> None:
    """AIEngine.evaluate_thread returns ThreadEvaluation from structured JSON."""
    from src.services.ai_engine import AIEngine

    json_response = (
        '{"gpa_relevance": 0.85, "category": "exam_info", '
        '"summary": "Exam date changed to next Friday", '
        '"urgency": "critical", "key_facts": ["Exam moved to Week 12"]}'
    )
    mock_resp = _make_mock_response(json_response)

    with patch("src.services.ai_engine.AsyncAnthropic") as mock_cls:
        client_instance = AsyncMock()
        client_instance.messages.create = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = client_instance

        engine = AIEngine(api_key="test-key")
        result = await engine.evaluate_thread(
            title="Exam Date Change",
            content="The final exam has been moved to Friday Week 12.",
            category="Admin",
            is_endorsed=True,
            is_staff_post=True,
        )

    assert isinstance(result, ThreadEvaluation)
    assert result.gpa_relevance == 0.85
    assert result.category == "exam_info"
    assert result.urgency == "critical"
    assert len(result.key_facts) >= 1


@pytest.mark.asyncio(loop_scope="session")
async def test_ask_question_returns_answer_with_citations() -> None:
    """AIEngine.ask_question extracts inline citations from response."""
    from src.services.ai_engine import AIEngine

    answer_text = (
        "Based on the materials, quicksort has O(n log n) average case "
        "[Canvas: Week 3 Lecture Notes]. The worst case is O(n^2) "
        "[Ed: Sorting Algorithms Lesson]."
    )
    mock_resp = _make_mock_response(answer_text)

    with patch("src.services.ai_engine.AsyncAnthropic") as mock_cls:
        client_instance = AsyncMock()
        client_instance.messages.create = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = client_instance

        engine = AIEngine(api_key="test-key")
        result = await engine.ask_question(
            question="What is the time complexity of quicksort?",
            context_text="Week 3 Lecture Notes: Quicksort analysis...",
        )

    assert isinstance(result, QAResponse)
    assert "quicksort" in result.answer.lower()
    assert "[Canvas: Week 3 Lecture Notes]" in result.citations
    assert "[Ed: Sorting Algorithms Lesson]" in result.citations
    assert result.tokens_used > 0


@pytest.mark.asyncio(loop_scope="session")
async def test_generate_review_returns_structured_output() -> None:
    """AIEngine.generate_review returns UnitReviewResponse with all sections."""
    from src.services.ai_engine import AIEngine

    json_response = (
        '{"key_concepts": ["Binary search", "Hash tables", "Graph traversal"], '
        '"common_mistakes": ["Off-by-one in binary search"], '
        '"exam_scope": "Focus on chapters 3-5, particularly sorting algorithms.", '
        '"study_tips": ["Practice with past exams", "Draw out graph algorithms"]}'
    )
    mock_resp = _make_mock_response(json_response)

    with patch("src.services.ai_engine.AsyncAnthropic") as mock_cls:
        client_instance = AsyncMock()
        client_instance.messages.create = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = client_instance

        engine = AIEngine(api_key="test-key")
        result = await engine.generate_review(
            materials_text="Chapter 3: Binary Search...",
            course_name="Data Structures",
        )

    assert isinstance(result, UnitReviewResponse)
    assert len(result.key_concepts) >= 1
    assert len(result.common_mistakes) >= 1
    assert result.exam_scope != ""
    assert len(result.study_tips) >= 1


@pytest.mark.asyncio(loop_scope="session")
async def test_analyze_gpa_risk_returns_recommendation() -> None:
    """AIEngine.analyze_gpa_risk uses claude-opus-4-6 and returns recommendation."""
    from src.services.ai_engine import AIEngine

    recommendation_text = (
        "Focus on COMP2017 where your WAM is 62. "
        "You need at least 80 on the final to reach your target."
    )
    mock_resp = _make_mock_response(recommendation_text)

    with patch("src.services.ai_engine.AsyncAnthropic") as mock_cls:
        client_instance = AsyncMock()
        client_instance.messages.create = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = client_instance

        engine = AIEngine(api_key="test-key")
        result = await engine.analyze_gpa_risk(
            current_wam=68.5,
            target_wam=80.0,
            course_grades_json='[{"code": "COMP2017", "wam": 62.0}]',
        )

    assert isinstance(result, str)
    assert len(result) > 0
    # Verify it used claude-opus-4-6 model
    call_kwargs: dict[str, Any] = client_instance.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-opus-4-6"


@pytest.mark.asyncio(loop_scope="session")
async def test_evaluate_thread_raises_on_invalid_json() -> None:
    """AIEngine.evaluate_thread raises ValueError when response is not valid JSON."""
    from src.services.ai_engine import AIEngine

    mock_resp = _make_mock_response("This is not JSON at all.")

    with patch("src.services.ai_engine.AsyncAnthropic") as mock_cls:
        client_instance = AsyncMock()
        client_instance.messages.create = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = client_instance

        engine = AIEngine(api_key="test-key")
        with pytest.raises(ValueError):
            await engine.evaluate_thread(
                title="Test",
                content="Test content",
                category="General",
                is_endorsed=False,
                is_staff_post=False,
            )
