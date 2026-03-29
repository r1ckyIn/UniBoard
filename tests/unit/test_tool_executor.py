"""Unit tests for ToolExecutor — routes MCP Agent tool calls to real adapters."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.schemas.common import TokenInvalidError, UpstreamAPIError, UpstreamUnavailableError


def _make_course(
    canvas_course_id: str | None = "12345",
    ed_course_id: str | None = "67890",
) -> MagicMock:
    """Create a mock Course object with platform IDs."""
    course = MagicMock()
    course.canvas_course_id = canvas_course_id
    course.ed_course_id = ed_course_id
    course.name = "Test Course"
    course.code = "TEST1001"
    course.id = uuid.uuid4()
    return course


class TestToolExecutorSearchCanvas:
    """Test search_canvas_modules tool routing."""

    @pytest.mark.asyncio
    async def test_search_canvas_modules_filters_by_query(self) -> None:
        """Test 1: execute search_canvas_modules calls CanvasAdapter.get_modules and filters."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_modules.return_value = [
            {
                "name": "Week 1",
                "items": [
                    {"title": "Midterm Prep", "type": "Page", "url": "http://..."},
                    {"title": "Lecture Notes", "type": "Page", "url": "http://..."},
                ],
            },
            {
                "name": "Week 2",
                "items": [
                    {"title": "Midterm Review", "type": "Page", "url": "http://..."},
                ],
            },
        ]

        course = _make_course()
        executor = ToolExecutor(
            canvas_token="test-token",
            ed_token=None,
            course=course,
        )

        with patch(
            "src.services.tool_executor.CanvasAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "search_canvas_modules", {"query": "midterm"}
            )

        assert "Midterm Prep" in result
        assert "Midterm Review" in result
        # "Lecture Notes" should NOT match "midterm"
        assert "Lecture Notes" not in result
        mock_adapter.get_modules.assert_awaited_once_with(
            course.canvas_course_id, include_items=True
        )

    @pytest.mark.asyncio
    async def test_search_canvas_no_matches(self) -> None:
        """Canvas search with no matching items returns appropriate message."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_modules.return_value = [
            {
                "name": "Week 1",
                "items": [
                    {"title": "Lecture Notes", "type": "Page"},
                ],
            },
        ]

        course = _make_course()
        executor = ToolExecutor(canvas_token="tok", ed_token=None, course=course)

        with patch(
            "src.services.tool_executor.CanvasAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "search_canvas_modules", {"query": "nonexistent"}
            )

        assert "No Canvas modules matched" in result


class TestToolExecutorSearchEdThreads:
    """Test search_ed_threads tool routing."""

    @pytest.mark.asyncio
    async def test_search_ed_threads_filters_by_query(self) -> None:
        """Test 2: execute search_ed_threads calls EdDiscussionAdapter.get_threads and filters."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_threads.return_value = [
            {
                "id": 1,
                "title": "Assignment 1 clarification",
                "content": "The due date has changed.",
                "is_endorsed": True,
            },
            {
                "id": 2,
                "title": "General question",
                "content": "When is the final?",
                "is_endorsed": False,
            },
        ]

        course = _make_course()
        executor = ToolExecutor(canvas_token=None, ed_token="ed-tok", course=course)

        with patch(
            "src.services.tool_executor.EdDiscussionAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "search_ed_threads", {"query": "assignment"}
            )

        assert "Assignment 1 clarification" in result
        # "General question" should NOT match "assignment"
        assert "General question" not in result
        mock_adapter.get_threads.assert_awaited_once()


class TestToolExecutorEdLesson:
    """Test get_ed_lesson_content tool routing."""

    @pytest.mark.asyncio
    async def test_get_ed_lesson_content(self) -> None:
        """Test 3: execute get_ed_lesson_content calls EdLessonsAdapter.get_lesson."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_lesson.return_value = {
            "id": 123,
            "title": "Intro to Python",
            "slides": [
                {"content": "Welcome to the course!", "title": "Slide 1"},
                {"content": "Python basics overview.", "title": "Slide 2"},
            ],
        }

        course = _make_course()
        executor = ToolExecutor(canvas_token=None, ed_token="ed-tok", course=course)

        with patch(
            "src.services.tool_executor.EdLessonsAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "get_ed_lesson_content", {"lesson_id": 123}
            )

        assert "Intro to Python" in result
        assert "Welcome to the course!" in result
        assert "Python basics overview." in result
        mock_adapter.get_lesson.assert_awaited_once_with("123")


class TestToolExecutorUnknownTool:
    """Test unknown tool handling."""

    @pytest.mark.asyncio
    async def test_unknown_tool_returns_error_string(self) -> None:
        """Test 4: Unknown tool name returns descriptive error string."""
        from src.services.tool_executor import ToolExecutor

        course = _make_course()
        executor = ToolExecutor(canvas_token=None, ed_token=None, course=course)
        result = await executor.execute("unknown_tool", {})
        assert "Unknown tool: unknown_tool" in result


class TestToolExecutorMissingTokens:
    """Test graceful handling of missing API tokens."""

    @pytest.mark.asyncio
    async def test_missing_canvas_token_graceful(self) -> None:
        """Test 5: Missing canvas_token returns friendly error, not exception."""
        from src.services.tool_executor import ToolExecutor

        course = _make_course()
        executor = ToolExecutor(canvas_token=None, ed_token="ed-tok", course=course)
        result = await executor.execute("search_canvas_modules", {"query": "test"})
        assert "Canvas API token not configured" in result

    @pytest.mark.asyncio
    async def test_missing_ed_token_graceful(self) -> None:
        """Test 6: Missing ed_token returns friendly error, not exception."""
        from src.services.tool_executor import ToolExecutor

        course = _make_course()
        executor = ToolExecutor(canvas_token="canvas-tok", ed_token=None, course=course)

        result_threads = await executor.execute(
            "search_ed_threads", {"query": "test"}
        )
        assert "Ed API token not configured" in result_threads

        result_lesson = await executor.execute(
            "get_ed_lesson_content", {"lesson_id": 1}
        )
        assert "Ed API token not configured" in result_lesson


class TestToolExecutorAdapterErrors:
    """Test error handling when adapters raise exceptions."""

    @pytest.mark.asyncio
    async def test_token_invalid_error_returns_string(self) -> None:
        """Test 7: TokenInvalidError from adapter returns user-friendly message."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_modules.side_effect = TokenInvalidError("Canvas")

        course = _make_course()
        executor = ToolExecutor(canvas_token="bad-tok", ed_token=None, course=course)

        with patch(
            "src.services.tool_executor.CanvasAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "search_canvas_modules", {"query": "test"}
            )

        assert "token is invalid or expired" in result.lower()

    @pytest.mark.asyncio
    async def test_upstream_unavailable_returns_string(self) -> None:
        """Test 8: UpstreamUnavailableError returns user-friendly message."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_modules.side_effect = UpstreamUnavailableError(
            "Canvas circuit breaker is open"
        )

        course = _make_course()
        executor = ToolExecutor(canvas_token="tok", ed_token=None, course=course)

        with patch(
            "src.services.tool_executor.CanvasAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "search_canvas_modules", {"query": "test"}
            )

        assert "temporarily unavailable" in result.lower()

    @pytest.mark.asyncio
    async def test_upstream_api_error_returns_string(self) -> None:
        """UpstreamAPIError from adapter returns user-friendly message."""
        from src.services.tool_executor import ToolExecutor

        mock_adapter = AsyncMock()
        mock_adapter.get_threads.side_effect = UpstreamAPIError("Ed", "HTTP 500")

        course = _make_course()
        executor = ToolExecutor(canvas_token=None, ed_token="tok", course=course)

        with patch(
            "src.services.tool_executor.EdDiscussionAdapter",
            return_value=mock_adapter,
        ):
            result = await executor.execute(
                "search_ed_threads", {"query": "test"}
            )

        assert "temporarily unavailable" in result.lower()


class TestToolExecutorClose:
    """Test cleanup of adapter HTTP clients."""

    @pytest.mark.asyncio
    async def test_close_cleans_up_adapters(self) -> None:
        """Test 9: close() calls close on all initialized adapters."""
        from src.services.tool_executor import ToolExecutor

        mock_canvas = AsyncMock()
        mock_ed_disc = AsyncMock()
        mock_ed_lessons = AsyncMock()

        course = _make_course()
        executor = ToolExecutor(canvas_token="tok", ed_token="tok", course=course)

        # Manually inject mock adapters (simulating lazy initialization)
        executor._canvas_adapter = mock_canvas
        executor._ed_discussion_adapter = mock_ed_disc
        executor._ed_lessons_adapter = mock_ed_lessons

        await executor.close()

        mock_canvas.close.assert_awaited_once()
        mock_ed_disc.close.assert_awaited_once()
        mock_ed_lessons.close.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_close_with_no_adapters(self) -> None:
        """close() works fine when no adapters were initialized."""
        from src.services.tool_executor import ToolExecutor

        course = _make_course()
        executor = ToolExecutor(canvas_token=None, ed_token=None, course=course)
        # Should not raise
        await executor.close()
