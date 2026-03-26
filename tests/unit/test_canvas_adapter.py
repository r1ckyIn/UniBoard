"""Unit tests for Canvas adapter with httpx MockTransport (no real API calls)."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from src.adapters.canvas import CanvasAdapter
from src.adapters.resilience import CanvasRateLimiter, CircuitBreaker, CircuitState, RetryConfig
from src.schemas.common import (
    RateLimitedError,
    TokenInvalidError,
    UpstreamAPIError,
    UpstreamUnavailableError,
)

BASE_URL = "https://canvas.sydney.edu.au/api/v1"

# Standard headers for all 200 responses
OK_HEADERS = {"x-rate-limit-remaining": "500", "content-type": "application/json"}


def _make_adapter(
    handler: Callable[[httpx.Request], httpx.Response],
    *,
    retry_base_delay: float = 0.01,
) -> CanvasAdapter:
    """Create a CanvasAdapter with mock transport for unit testing."""
    adapter = CanvasAdapter.__new__(CanvasAdapter)
    adapter._base_url = BASE_URL
    adapter._client = httpx.AsyncClient(
        base_url=BASE_URL,
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer fake-token"},
    )
    adapter._rate_limiter = CanvasRateLimiter()
    adapter._circuit = CircuitBreaker()
    adapter._retry = RetryConfig(base_delay=retry_base_delay)
    return adapter


def _json_response(
    data: Any,
    status_code: int = 200,
    headers: dict[str, str] | None = None,
) -> httpx.Response:
    """Build an httpx.Response with JSON body."""
    hdrs = dict(OK_HEADERS)
    if headers:
        hdrs.update(headers)
    return httpx.Response(
        status_code,
        content=json.dumps(data).encode(),
        headers=hdrs,
    )


# --- Success path tests ---


class TestCanvasAdapterSuccess:
    """Test all public methods return expected data on 200 responses."""

    async def test_get_courses_success(self) -> None:
        """get_courses returns parsed course list from mock API."""
        courses = [{"id": 69855, "name": "COMP2017", "enrollment_state": "active"}]

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses" in str(request.url)
            return _json_response(courses)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_courses()
            assert len(result) == 1
            assert result[0]["name"] == "COMP2017"
            assert result[0]["id"] == 69855
        finally:
            await adapter.close()

    async def test_get_grades_success(self) -> None:
        """get_grades returns enrollment data for a course."""
        enrollments = [
            {
                "user_id": 123,
                "course_id": 69855,
                "grades": {"current_score": 85.5},
                "current_points": 171,
            }
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses/69855/enrollments" in str(request.url)
            return _json_response(enrollments)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_grades("69855")
            assert len(result) == 1
            assert result[0]["current_points"] == 171
        finally:
            await adapter.close()

    async def test_get_assignments_success(self) -> None:
        """get_assignments returns assignment data."""
        assignments = [
            {"id": 1001, "name": "Assignment 1", "due_at": "2026-04-01T23:59:00Z"}
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses/69855/assignments" in str(request.url)
            return _json_response(assignments)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_assignments("69855")
            assert len(result) == 1
            assert result[0]["name"] == "Assignment 1"
        finally:
            await adapter.close()

    async def test_get_modules_success(self) -> None:
        """get_modules returns modules with inline items (include[]=items)."""
        modules = [
            {
                "id": 10,
                "name": "Week 1",
                "items": [
                    {"id": 100, "title": "Lecture Slides", "type": "File"},
                    {"id": 101, "title": "Lab Exercise", "type": "Assignment"},
                ],
            }
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            assert "/courses/69855/modules" in url_str
            # Verify include[]=items parameter is sent
            assert "include" in url_str
            return _json_response(modules)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_modules("69855")
            assert len(result) == 1
            assert len(result[0]["items"]) == 2  # type: ignore[arg-type]
        finally:
            await adapter.close()

    async def test_get_assignment_groups_success(self) -> None:
        """get_assignment_groups returns weight data."""
        groups = [
            {"id": 1, "name": "Assignments", "group_weight": 60},
            {"id": 2, "name": "Exam", "group_weight": 40},
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses/69855/assignment_groups" in str(request.url)
            return _json_response(groups)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_assignment_groups("69855")
            assert len(result) == 2
            assert result[0]["group_weight"] == 60
            assert result[1]["name"] == "Exam"
        finally:
            await adapter.close()

    async def test_get_tabs_success(self) -> None:
        """get_tabs returns tab list for a course."""
        tabs = [
            {"id": "home", "label": "Home", "visibility": "public"},
            {"id": "modules", "label": "Modules", "visibility": "public"},
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses/69855/tabs" in str(request.url)
            return _json_response(tabs)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_tabs("69855")
            assert len(result) == 2
            assert result[0]["label"] == "Home"
        finally:
            await adapter.close()

    async def test_get_external_tool_success(self) -> None:
        """get_external_tool returns tool JSON."""
        tool = {"id": 555, "name": "Ed Discussion", "url": "https://edstem.org/lti"}

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses/69855/external_tools/555" in str(request.url)
            return _json_response(tool)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_external_tool("69855", "555")
            assert result["name"] == "Ed Discussion"
            assert result["id"] == 555
        finally:
            await adapter.close()


# --- Token validation tests ---


class TestCanvasAdapterValidateToken:
    """Test validate_token method."""

    async def test_validate_token_valid(self) -> None:
        """200 from /users/self -> returns True."""

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/users/self" in str(request.url)
            return _json_response({"id": 42, "name": "Test User"})

        adapter = _make_adapter(handler)
        try:
            assert await adapter.validate_token() is True
        finally:
            await adapter.close()

    async def test_validate_token_invalid(self) -> None:
        """401 from /users/self -> returns False."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            assert await adapter.validate_token() is False
        finally:
            await adapter.close()


# --- Pagination tests ---


class TestCanvasAdapterPagination:
    """Test Link header pagination."""

    async def test_pagination_follows_link_header(self) -> None:
        """Two pages connected by Link header rel='next' are combined."""
        page1_data = [{"id": 1, "name": "Course A"}]
        page2_data = [{"id": 2, "name": "Course B"}]
        next_url = f"{BASE_URL}/courses?page=2&per_page=100"

        call_count = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            url_str = str(request.url)

            if "page=2" in url_str:
                # Second page: no Link header
                return _json_response(page2_data)
            else:
                # First page: has Link header with rel="next"
                return _json_response(
                    page1_data,
                    headers={"link": f'<{next_url}>; rel="next"'},
                )

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_courses()
            assert len(result) == 2
            assert result[0]["id"] == 1
            assert result[1]["id"] == 2
            assert call_count == 2
        finally:
            await adapter.close()


# --- Error handling tests ---


class TestCanvasAdapterErrors:
    """Test error handling: 401, 403, 429, 5xx, circuit breaker."""

    async def test_token_invalid_401_raises(self) -> None:
        """401 response raises TokenInvalidError with platform 'Canvas'."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            with pytest.raises(TokenInvalidError) as exc_info:
                await adapter.get_courses()
            assert exc_info.value.platform == "Canvas"
        finally:
            await adapter.close()

    async def test_token_invalid_403_raises(self) -> None:
        """403 response raises TokenInvalidError."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(403, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            with pytest.raises(TokenInvalidError) as exc_info:
                await adapter.get_courses()
            assert exc_info.value.platform == "Canvas"
        finally:
            await adapter.close()

    async def test_rate_limited_429_retries_then_raises(self) -> None:
        """429 three times exhausts retries and raises RateLimitedError."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                429,
                headers={
                    "x-rate-limit-remaining": "0",
                    "retry-after": "10",
                    "content-type": "application/json",
                },
            )

        adapter = _make_adapter(handler, retry_base_delay=0.01)
        try:
            with pytest.raises(RateLimitedError):
                await adapter.get_courses()
        finally:
            await adapter.close()

    async def test_server_error_retries_then_raises(self) -> None:
        """500 three times exhausts retries and raises UpstreamAPIError."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, headers=OK_HEADERS)

        adapter = _make_adapter(handler, retry_base_delay=0.01)
        try:
            with pytest.raises(UpstreamAPIError):
                await adapter.get_courses()
        finally:
            await adapter.close()

    async def test_circuit_breaker_open_raises(self) -> None:
        """OPEN circuit breaker raises UpstreamUnavailableError immediately."""

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response([])

        adapter = _make_adapter(handler)
        # Force circuit to OPEN state
        adapter._circuit.state = CircuitState.OPEN
        adapter._circuit.failure_count = 10
        # Set last_failure_time to recent so recovery hasn't elapsed
        import time

        adapter._circuit.last_failure_time = time.monotonic()
        try:
            with pytest.raises(UpstreamUnavailableError):
                await adapter.get_courses()
        finally:
            await adapter.close()


# --- Rate limiter header update test ---


class TestCanvasAdapterRateLimiter:
    """Test rate limiter updates from response headers."""

    async def test_rate_limiter_updates_from_response(self) -> None:
        """After response with x-rate-limit-remaining: '42', rate limiter reflects 42.0."""

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response(
                [{"id": 1}],
                headers={"x-rate-limit-remaining": "42"},
            )

        adapter = _make_adapter(handler)
        try:
            await adapter.get_courses()
            assert adapter._rate_limiter.remaining == 42.0
        finally:
            await adapter.close()
