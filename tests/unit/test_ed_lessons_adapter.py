"""Unit tests for Ed Lessons adapter with MockTransport (TRD SS9.4 field mapping)."""

from __future__ import annotations

import time
from collections.abc import Callable

import httpx
import pytest

from src.adapters.ed_lessons import EdLessonsAdapter
from src.adapters.resilience import CircuitBreaker, CircuitState, RetryConfig
from src.schemas.common import TokenInvalidError, UpstreamUnavailableError

# --- Fixture data using CORRECT field names per TRD SS9.4 ---

LESSON_FIXTURE: dict[str, object] = {
    "id": 101,
    "title": "Week 1: Introduction",
    "course_id": 12345,
    "module_id": 1,
    "number": 1,  # CRITICAL: "number" not "lesson_number"
    "kind": "lesson",
    "state": "published",
    "slide_count": 5,
    "due_at": None,
    "slides": [],
}

MODULE_FIXTURE: dict[str, object] = {
    "id": 1,
    "course_id": 12345,
    "user_id": 42,  # CRITICAL: "user_id" not "creator_id"
    "name": "Module 1: Foundations",
}

SLIDE_FIXTURE: dict[str, object] = {
    "id": 201,
    "lesson_id": 101,
    "content": "<p>Slide content</p>",  # CRITICAL: "content" not "passage"
    "type": "document",
    "title": "Slide 1",
    "index": 0,
    "is_hidden": False,
}


def _make_adapter(
    handler: Callable[[httpx.Request], httpx.Response],
) -> EdLessonsAdapter:
    """Create an EdLessonsAdapter with a MockTransport for testing."""
    adapter = EdLessonsAdapter.__new__(EdLessonsAdapter)
    adapter._client = httpx.AsyncClient(
        base_url="https://edstem.org/api",
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer fake-token"},
    )
    adapter._circuit = CircuitBreaker()
    adapter._retry = RetryConfig(base_delay=0.01, max_delay=0.1)
    adapter._platform_name = "Ed Lessons"
    return adapter


# --- get_lessons tests ---


class TestGetLessons:
    """Test EdLessonsAdapter.get_lessons with MockTransport."""

    async def test_get_lessons_success(self) -> None:
        """get_lessons returns (lessons, modules) tuple with parsed data."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={"lessons": [LESSON_FIXTURE], "modules": [MODULE_FIXTURE]},
            )

        adapter = _make_adapter(handler)
        try:
            lessons, modules = await adapter.get_lessons("12345")
            assert len(lessons) == 1
            assert len(modules) == 1
            assert lessons[0]["title"] == "Week 1: Introduction"
            assert modules[0]["name"] == "Module 1: Foundations"
        finally:
            await adapter.close()

    async def test_get_lessons_empty(self) -> None:
        """Empty lessons and modules returns ([], [])."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"lessons": [], "modules": []})

        adapter = _make_adapter(handler)
        try:
            lessons, modules = await adapter.get_lessons("12345")
            assert lessons == []
            assert modules == []
        finally:
            await adapter.close()

    async def test_get_lessons_parse_error_graceful(self) -> None:
        """Mixed valid + invalid lessons: valid ones returned, invalid skipped."""
        invalid_lesson = {"bad": "data"}  # Missing required fields

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "lessons": [LESSON_FIXTURE, invalid_lesson],
                    "modules": [MODULE_FIXTURE],
                },
            )

        adapter = _make_adapter(handler)
        try:
            lessons, modules = await adapter.get_lessons("12345")
            assert len(lessons) == 1  # Only valid lesson parsed
            assert len(modules) == 1
        finally:
            await adapter.close()

    async def test_get_lessons_extra_fields_ignored(self) -> None:
        """Lesson with undocumented fields parsed successfully (extra='ignore')."""
        extended_lesson = {
            **LESSON_FIXTURE,
            "undocumented_field": "should be ignored",
            "another_extra": 999,
        }

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={"lessons": [extended_lesson], "modules": []},
            )

        adapter = _make_adapter(handler)
        try:
            lessons, _ = await adapter.get_lessons("12345")
            assert len(lessons) == 1
            assert lessons[0]["title"] == "Week 1: Introduction"
            # Extra fields should NOT be in the parsed output
            assert "undocumented_field" not in lessons[0]
        finally:
            await adapter.close()

    async def test_get_lessons_field_names_trd_ss94(self) -> None:
        """Verify TRD SS9.4 field names: 'number' not 'lesson_number', etc."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "lessons": [LESSON_FIXTURE],
                    "modules": [MODULE_FIXTURE],
                },
            )

        adapter = _make_adapter(handler)
        try:
            lessons, modules = await adapter.get_lessons("12345")
            # "number" field (not "lesson_number")
            assert lessons[0]["number"] == 1
            # "user_id" field in module (not "creator_id")
            assert modules[0]["user_id"] == 42
        finally:
            await adapter.close()


# --- get_lesson tests ---


class TestGetLesson:
    """Test EdLessonsAdapter.get_lesson for single lesson detail."""

    async def test_get_lesson_detail_success(self) -> None:
        """get_lesson returns lesson dict with slides populated."""
        lesson_with_slides = {**LESSON_FIXTURE, "slides": [SLIDE_FIXTURE]}

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"lesson": lesson_with_slides})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_lesson("101")
            assert result["title"] == "Week 1: Introduction"
            slides = result["slides"]
            assert isinstance(slides, list)
            assert len(slides) == 1
            assert slides[0]["content"] == "<p>Slide content</p>"  # "content" not "passage"
        finally:
            await adapter.close()

    async def test_get_lesson_not_found(self) -> None:
        """404 response returns empty dict."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(404, json={"error": "Not found"})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_lesson("999")
            assert result == {}
        finally:
            await adapter.close()


# --- Error handling tests ---


class TestErrorHandling:
    """Test token validation, auth errors, circuit breaker, retry."""

    async def test_token_invalid_401_raises(self) -> None:
        """401 response raises TokenInvalidError with platform='Ed Lessons'."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, json={"error": "Unauthorized"})

        adapter = _make_adapter(handler)
        try:
            with pytest.raises(TokenInvalidError) as exc_info:
                await adapter.get_lessons("123")
            assert exc_info.value.platform == "Ed Lessons"
        finally:
            await adapter.close()

    async def test_token_invalid_403_raises(self) -> None:
        """403 response raises TokenInvalidError."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(403, json={"error": "Forbidden"})

        adapter = _make_adapter(handler)
        try:
            with pytest.raises(TokenInvalidError):
                await adapter.get_lessons("123")
        finally:
            await adapter.close()

    async def test_circuit_breaker_open_raises(self) -> None:
        """Circuit set to OPEN raises UpstreamUnavailableError from _request.

        get_lessons catches this and returns ([], []), so we test _request directly.
        """

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={})

        adapter = _make_adapter(handler)
        adapter._circuit.state = CircuitState.OPEN
        adapter._circuit.last_failure_time = time.monotonic()  # Just failed — recovery not elapsed

        try:
            with pytest.raises(UpstreamUnavailableError):
                await adapter._request("GET", "/courses/123/lessons")
        finally:
            await adapter.close()

    async def test_validate_token_valid(self) -> None:
        """200 for /courses returns True."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"courses": []})

        adapter = _make_adapter(handler)
        try:
            assert await adapter.validate_token() is True
        finally:
            await adapter.close()

    async def test_validate_token_invalid(self) -> None:
        """401 for /courses returns False."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, json={"error": "Unauthorized"})

        adapter = _make_adapter(handler)
        try:
            assert await adapter.validate_token() is False
        finally:
            await adapter.close()

    async def test_retry_on_429(self) -> None:
        """429 twice then 200 -> retries and returns data."""
        call_count = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                return httpx.Response(429, json={"error": "Rate limited"})
            return httpx.Response(
                200,
                json={"lessons": [LESSON_FIXTURE], "modules": []},
            )

        adapter = _make_adapter(handler)
        try:
            lessons, _ = await adapter.get_lessons("12345")
            assert len(lessons) == 1
            assert call_count == 3  # 2 retries + 1 success
        finally:
            await adapter.close()

    async def test_network_error_graceful(self) -> None:
        """ConnectError -> get_lessons returns ([], [])."""

        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("Connection refused")

        adapter = _make_adapter(handler)
        try:
            lessons, modules = await adapter.get_lessons("12345")
            assert lessons == []
            assert modules == []
        finally:
            await adapter.close()
