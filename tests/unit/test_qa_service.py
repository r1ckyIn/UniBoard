"""Unit tests for QAService with mocked AIEngine and session."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.schemas.ai import QAResponse


async def _async_gen_tokens(*tokens: str) -> Any:
    """Create an async generator yielding string tokens."""
    for t in tokens:
        yield t


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


def _make_mock_skill() -> MagicMock:
    """Build a mock Skill ORM object."""
    skill = MagicMock()
    skill.id = uuid.uuid4()
    skill.operation_type = "qa_agent"
    skill.system_prompt = "Test skill prompt"
    skill.status = "active"
    return skill


def _make_session_mocks(
    mock_user: MagicMock,
    mock_course: MagicMock,
) -> AsyncMock:
    """Build a mock AsyncSession returning user then course from execute()."""
    mock_session = AsyncMock()

    user_result = MagicMock()
    user_result.scalar_one_or_none = MagicMock(return_value=mock_user)
    course_result = MagicMock()
    course_result.scalar_one_or_none = MagicMock(return_value=mock_course)
    mock_session.execute = AsyncMock(side_effect=[user_result, course_result])
    mock_session.flush = AsyncMock()

    return mock_session


def _make_agent_stream_with_tool_call(
    tool_executor_callback_name: str = "search_canvas_modules",
    tool_executor_callback_input: dict[str, object] | None = None,
) -> Any:
    """Create a mock agent_stream that invokes tool_executor during streaming.

    This simulates the AIEngine calling tools mid-stream.
    """
    if tool_executor_callback_input is None:
        tool_executor_callback_input = {"query": "midterm"}

    async def _agent_stream(
        question: str,
        context_text: str,
        tools: list[dict[str, object]],
        tool_executor: Any,
        language: str = "en",
        **kwargs: Any,
    ) -> Any:
        # Yield a token, call a tool, yield another token
        yield "Agent "
        await tool_executor(tool_executor_callback_name, tool_executor_callback_input)
        yield "response"

    return _agent_stream


def _make_agent_stream_with_error(
    tool_executor_callback_name: str = "search_canvas_modules",
) -> Any:
    """Create a mock agent_stream that invokes a tool then raises an error."""

    async def _agent_stream(
        question: str,
        context_text: str,
        tools: list[dict[str, object]],
        tool_executor: Any,
        language: str = "en",
        **kwargs: Any,
    ) -> Any:
        yield "partial "
        await tool_executor(tool_executor_callback_name, {"query": "test"})
        raise RuntimeError("AI engine error")

    return _agent_stream


# ---------------------------------------------------------------------------
# Existing tests (backward compatible -- no changes needed)
# ---------------------------------------------------------------------------


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

    # execute() is called twice: first for SELECT FOR UPDATE (user), then for course query
    user_result = MagicMock()
    user_result.scalar_one_or_none = MagicMock(return_value=mock_user)
    course_result = MagicMock()
    course_result.scalar_one_or_none = MagicMock(return_value=mock_course)
    mock_session.execute = AsyncMock(side_effect=[user_result, course_result])
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
    user_result = MagicMock()
    user_result.scalar_one_or_none = MagicMock(return_value=mock_user)
    mock_session.execute = AsyncMock(return_value=user_result)
    mock_session.flush = AsyncMock()

    svc = QAService(session=mock_session, ai_engine=mock_ai)

    with pytest.raises(RateLimitedError):
        await svc.answer_question(
            user_id=mock_user.id,
            course_id=uuid.uuid4(),
            question="What is the answer?",
        )

    # AI should NOT have been called
    mock_ai.ask_question.assert_not_called()


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_question_direct_context() -> None:
    """QAService.stream_answer_question uses direct streaming when tokens >= 500."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.stream_question = MagicMock(
        return_value=_async_gen_tokens("Hello", " there")
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    # Use enough text to produce >= 500 tokens
    mock_course = _make_mock_course(text_tokens=5000)

    mock_session = _make_session_mocks(mock_user, mock_course)

    svc = QAService(session=mock_session, ai_engine=mock_ai)
    tokens: list[str] = []
    async for tok in svc.stream_answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="What is the answer?",
        language="en",
    ):
        tokens.append(tok)

    assert tokens == ["Hello", " there"]
    mock_ai.stream_question.assert_called_once()


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_question_mcp_fallback_low_tokens() -> None:
    """QAService.stream_answer_question triggers MCP fallback when context < 500 tokens."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.agent_stream = MagicMock(
        return_value=_async_gen_tokens("Agent", " response")
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    # Use very little text to produce < 500 tokens
    mock_course = _make_mock_course(text_tokens=100)

    mock_session = _make_session_mocks(mock_user, mock_course)

    svc = QAService(session=mock_session, ai_engine=mock_ai)
    tokens: list[str] = []
    async for tok in svc.stream_answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="What is the answer?",
        language="en",
    ):
        tokens.append(tok)

    assert tokens == ["Agent", " response"]
    mock_ai.agent_stream.assert_called_once()


# ---------------------------------------------------------------------------
# New tests: ToolExecutor + SkillService integration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_uses_tool_executor() -> None:
    """When ToolExecutor is provided, agent branch uses it instead of placeholder."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.agent_stream = MagicMock(
        side_effect=lambda **kwargs: _make_agent_stream_with_tool_call()(
            **kwargs
        )
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    mock_course = _make_mock_course(text_tokens=100)
    mock_session = _make_session_mocks(mock_user, mock_course)

    # Mock ToolExecutor
    mock_tool_executor = AsyncMock()
    mock_tool_executor.execute = AsyncMock(return_value="Canvas result: midterm info")

    # Mock SkillService
    mock_skill_service = AsyncMock()
    mock_skill_service.get_skill = AsyncMock(return_value=None)
    mock_skill_service.record_execution = AsyncMock()
    mock_skill_service.maybe_generate_skill = AsyncMock(return_value=None)

    svc = QAService(
        session=mock_session,
        ai_engine=mock_ai,
        tool_executor=mock_tool_executor,
        skill_service=mock_skill_service,
    )

    tokens: list[str] = []
    async for tok in svc.stream_answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="When is the midterm?",
        language="en",
    ):
        tokens.append(tok)

    assert tokens == ["Agent ", "response"]
    # ToolExecutor.execute should have been called (not placeholder)
    mock_tool_executor.execute.assert_called_once_with(
        "search_canvas_modules", {"query": "midterm"}
    )
    # Trace should have been recorded as success
    mock_skill_service.record_execution.assert_called_once()
    call_kwargs = mock_skill_service.record_execution.call_args.kwargs
    assert call_kwargs["success"] is True
    assert call_kwargs["operation_type"] == "qa_agent"
    # No existing skill, so maybe_generate_skill should be called
    mock_skill_service.maybe_generate_skill.assert_called_once()


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_uses_skill_lookup() -> None:
    """SkillService.get_skill is called with (qa_agent, course_id) before agent_stream."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.agent_stream = MagicMock(
        return_value=_async_gen_tokens("Agent", " result")
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    mock_course = _make_mock_course(text_tokens=100)
    mock_session = _make_session_mocks(mock_user, mock_course)

    mock_skill = _make_mock_skill()
    mock_skill_service = AsyncMock()
    mock_skill_service.get_skill = AsyncMock(return_value=mock_skill)
    mock_skill_service.mark_success = AsyncMock()
    mock_skill_service.record_execution = AsyncMock()

    svc = QAService(
        session=mock_session,
        ai_engine=mock_ai,
        skill_service=mock_skill_service,
    )

    tokens: list[str] = []
    async for tok in svc.stream_answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="Test Q",
        language="en",
    ):
        tokens.append(tok)

    # Verify get_skill was called with correct args
    mock_skill_service.get_skill.assert_called_once_with(
        "qa_agent", mock_course.id
    )


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_records_trace_on_failure() -> None:
    """On agent_stream error, execution trace is recorded with success=False."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.agent_stream = MagicMock(
        side_effect=lambda **kwargs: _make_agent_stream_with_error()(
            **kwargs
        )
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    mock_course = _make_mock_course(text_tokens=100)
    mock_session = _make_session_mocks(mock_user, mock_course)

    # Mock ToolExecutor to return a result before error
    mock_tool_executor = AsyncMock()
    mock_tool_executor.execute = AsyncMock(return_value="partial data")

    mock_skill = _make_mock_skill()
    mock_skill_service = AsyncMock()
    mock_skill_service.get_skill = AsyncMock(return_value=mock_skill)
    mock_skill_service.record_execution = AsyncMock()
    mock_skill_service.mark_failure = AsyncMock()

    svc = QAService(
        session=mock_session,
        ai_engine=mock_ai,
        tool_executor=mock_tool_executor,
        skill_service=mock_skill_service,
    )

    tokens: list[str] = []
    with pytest.raises(RuntimeError, match="AI engine error"):
        async for tok in svc.stream_answer_question(
            user_id=mock_user.id,
            course_id=mock_course.id,
            question="Will this fail?",
            language="en",
        ):
            tokens.append(tok)

    # Partial tokens should have been yielded before error
    assert "partial " in tokens

    # Trace should have been recorded as failure
    mock_skill_service.record_execution.assert_called_once()
    call_kwargs = mock_skill_service.record_execution.call_args.kwargs
    assert call_kwargs["success"] is False
    assert call_kwargs["skill_id"] == mock_skill.id

    # Skill should be marked as failed
    mock_skill_service.mark_failure.assert_called_once_with(mock_skill.id)


@pytest.mark.asyncio(loop_scope="session")
async def test_answer_rag_uses_async_client() -> None:
    """_answer_rag() must use voyageai.AsyncClient (not Client) with await on embed()."""
    import sys
    from unittest.mock import patch

    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.ask_question = AsyncMock(
        return_value=QAResponse(
            answer="RAG answer",
            citations=["[chunk 0]"],
            method="rag",
            tokens_used=100,
        )
    )

    # Mock voyageai module
    mock_voyageai = MagicMock()
    mock_async_client_instance = MagicMock()
    # embed() must be AsyncMock since we await it
    mock_embed_result = MagicMock()
    mock_embed_result.embeddings = [[0.1] * 1024]
    mock_async_client_instance.embed = AsyncMock(return_value=mock_embed_result)
    mock_voyageai.AsyncClient = MagicMock(return_value=mock_async_client_instance)

    course_id = uuid.uuid4()

    # Build session that returns chunks from vector query
    mock_session = AsyncMock()
    mock_chunk = MagicMock()
    mock_chunk.source_type = "mixed"
    mock_chunk.chunk_index = 0
    mock_chunk.chunk_text = "Test chunk content"
    chunks_result = MagicMock()
    chunks_result.scalars = MagicMock(
        return_value=MagicMock(all=MagicMock(return_value=[mock_chunk]))
    )
    mock_session.execute = AsyncMock(return_value=chunks_result)
    mock_session.flush = AsyncMock()

    svc = QAService(session=mock_session, ai_engine=mock_ai, voyage_api_key="test-key")

    # Use real ContentEmbedding and inject cosine_distance into pgvector.sqlalchemy
    from sqlalchemy import text

    # cosine_distance must return a valid SQLAlchemy expression
    mock_cosine_distance = MagicMock(side_effect=lambda col, vec: text("1"))
    pgvector_sa_mod = sys.modules["pgvector.sqlalchemy"]

    with (
        patch.dict(sys.modules, {"voyageai": mock_voyageai}),
        patch.object(pgvector_sa_mod, "cosine_distance", mock_cosine_distance, create=True),
    ):
        result = await svc._answer_rag(question="What is X?", course_id=course_id)

    # Verify AsyncClient was used (not Client)
    mock_voyageai.AsyncClient.assert_called_once_with(api_key="test-key")
    # Verify embed was awaited
    mock_async_client_instance.embed.assert_called_once()
    assert result.method == "rag"


@pytest.mark.asyncio(loop_scope="session")
async def test_embed_course_materials_uses_async_client() -> None:
    """embed_course_materials() must use voyageai.AsyncClient (not Client) with await."""
    import sys
    from unittest.mock import patch

    from src.services.qa import QAService

    mock_ai = AsyncMock()
    course_id = uuid.uuid4()

    # Build a mock course with some materials
    mock_course = _make_mock_course(text_tokens=500)

    # Session: first call returns course, second call (delete) succeeds, flush succeeds
    mock_session = AsyncMock()
    course_result = MagicMock()
    course_result.scalar_one_or_none = MagicMock(return_value=mock_course)
    mock_session.execute = AsyncMock(return_value=course_result)
    mock_session.flush = AsyncMock()
    mock_session.add = MagicMock()

    # Mock voyageai module -- only mock voyageai, use real ContentEmbedding
    mock_voyageai = MagicMock()
    mock_async_client_instance = MagicMock()
    mock_embed_result = MagicMock()
    # Return multiple embeddings for multiple chunks
    mock_embed_result.embeddings = [[0.1] * 1024, [0.2] * 1024]
    mock_async_client_instance.embed = AsyncMock(return_value=mock_embed_result)
    mock_voyageai.AsyncClient = MagicMock(return_value=mock_async_client_instance)

    svc = QAService(session=mock_session, ai_engine=mock_ai, voyage_api_key="test-key")

    with patch.dict(sys.modules, {"voyageai": mock_voyageai}):
        count = await svc.embed_course_materials(course_id=course_id)

    # Verify AsyncClient was used (not Client)
    mock_voyageai.AsyncClient.assert_called_once_with(api_key="test-key")
    # Verify embed was awaited
    mock_async_client_instance.embed.assert_called_once()
    assert count == 2


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_backward_compatible() -> None:
    """QAService works with tool_executor=None, skill_service=None (original constructor)."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.agent_stream = MagicMock(
        return_value=_async_gen_tokens("fallback", " answer")
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    mock_course = _make_mock_course(text_tokens=100)
    mock_session = _make_session_mocks(mock_user, mock_course)

    # Original constructor signature: no tool_executor or skill_service
    svc = QAService(session=mock_session, ai_engine=mock_ai)

    tokens: list[str] = []
    async for tok in svc.stream_answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="Backward compat test",
        language="en",
    ):
        tokens.append(tok)

    assert tokens == ["fallback", " answer"]
    mock_ai.agent_stream.assert_called_once()


@pytest.mark.asyncio(loop_scope="session")
async def test_stream_answer_marks_skill_success() -> None:
    """When an existing skill is used, mark_success is called on completion."""
    from src.services.qa import QAService

    mock_ai = AsyncMock()
    mock_ai.agent_stream = MagicMock(
        side_effect=lambda **kwargs: _make_agent_stream_with_tool_call()(
            **kwargs
        )
    )

    mock_user = _make_mock_user(ai_calls_today=0)
    mock_course = _make_mock_course(text_tokens=100)
    mock_session = _make_session_mocks(mock_user, mock_course)

    mock_skill = _make_mock_skill()
    mock_tool_executor = AsyncMock()
    mock_tool_executor.execute = AsyncMock(return_value="Canvas data")

    mock_skill_service = AsyncMock()
    mock_skill_service.get_skill = AsyncMock(return_value=mock_skill)
    mock_skill_service.record_execution = AsyncMock()
    mock_skill_service.mark_success = AsyncMock()

    svc = QAService(
        session=mock_session,
        ai_engine=mock_ai,
        tool_executor=mock_tool_executor,
        skill_service=mock_skill_service,
    )

    tokens: list[str] = []
    async for tok in svc.stream_answer_question(
        user_id=mock_user.id,
        course_id=mock_course.id,
        question="Using skill",
        language="en",
    ):
        tokens.append(tok)

    # mark_success called with skill.id, NOT maybe_generate_skill
    mock_skill_service.mark_success.assert_called_once_with(mock_skill.id)
    mock_skill_service.maybe_generate_skill.assert_not_called()
