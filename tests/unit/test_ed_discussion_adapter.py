"""Unit tests for Ed Discussion adapter with httpx MockTransport (no real API calls)."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from src.adapters.ed_discussion import EdDiscussionAdapter
from src.adapters.resilience import CircuitBreaker, CircuitState, RetryConfig
from src.schemas.common import TokenInvalidError, UpstreamUnavailableError
from tests.unit.conftest import json_response

BASE_URL = "https://edstem.org/api"

OK_HEADERS = {"content-type": "application/json"}

# Shared thread fixture data for success tests
THREAD_FIXTURE: dict[str, Any] = {
    "id": 1,
    "title": "Question about Assignment 1",
    "user_id": 42,
    "user": {"id": 42, "course_role": "student"},
    "category": "General",
    "content": '<document version="2.0"><paragraph>Help</paragraph></document>',
    "is_endorsed": True,
    "is_answered": True,
    "is_staff_answered": False,
    "is_student_answered": True,
    "is_pinned": False,
    "vote_count": 5,
    "created_at": "2026-03-01T10:00:00Z",
}


def _make_adapter(
    handler: Callable[[httpx.Request], httpx.Response],
    *,
    retry_base_delay: float = 0.01,
) -> EdDiscussionAdapter:
    """Create an EdDiscussionAdapter with mock transport."""
    adapter = EdDiscussionAdapter.__new__(EdDiscussionAdapter)
    adapter._client = httpx.AsyncClient(
        base_url=BASE_URL,
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer fake-token"},
    )
    adapter._circuit = CircuitBreaker()
    adapter._retry = RetryConfig(base_delay=retry_base_delay)
    return adapter


def _json_response(
    data: object,
    status_code: int = 200,
    headers: dict[str, str] | None = None,
) -> httpx.Response:
    """Build a JSON response with Ed Discussion headers."""
    return json_response(data, status_code, headers, base_headers=OK_HEADERS)


# --- get_threads tests ---


class TestEdDiscussionGetThreads:
    """Test get_threads method and its variations."""

    async def test_get_threads_success(self) -> None:
        """200 with thread list -> returns parsed thread list."""

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses/123/threads" in str(request.url)
            return _json_response({"threads": [THREAD_FIXTURE]})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_threads("123")
            assert len(result) == 1
            assert result[0]["title"] == "Question about Assignment 1"
            assert result[0]["is_endorsed"] is True
            assert result[0]["vote_count"] == 5
        finally:
            await adapter.close()

    async def test_get_threads_with_filter(self) -> None:
        """Filter parameter is forwarded to request params."""

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            assert "filter=unanswered" in url_str
            return _json_response({"threads": [THREAD_FIXTURE]})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_threads("123", filter="unanswered")
            assert len(result) == 1
        finally:
            await adapter.close()

    async def test_get_threads_empty(self) -> None:
        """200 with empty threads list -> returns empty list."""

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response({"threads": []})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_threads("123")
            assert result == []
        finally:
            await adapter.close()

    async def test_get_threads_parse_error_graceful(self) -> None:
        """Malformed thread item is skipped, valid items are kept."""
        threads = [
            THREAD_FIXTURE,
            {"bad": "data"},  # Missing required 'id' and 'title'
        ]

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response({"threads": threads})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_threads("123")
            assert len(result) == 1
            assert result[0]["id"] == 1
        finally:
            await adapter.close()

    async def test_get_threads_extra_fields_ignored(self) -> None:
        """Extra undocumented fields are silently ignored (extra='ignore')."""
        thread_with_extras = {
            **THREAD_FIXTURE,
            "unknown_field": 42,
            "nested_unknown": {"a": 1},
            "another_extra": True,
        }

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response({"threads": [thread_with_extras]})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_threads("123")
            assert len(result) == 1
            assert result[0]["title"] == "Question about Assignment 1"
            # Extra fields should NOT be in the parsed output
            assert "unknown_field" not in result[0]
            assert "nested_unknown" not in result[0]
        finally:
            await adapter.close()


# --- get_thread tests ---


class TestEdDiscussionGetThread:
    """Test get_thread (singular) method."""

    async def test_get_thread_success(self) -> None:
        """200 with singular 'thread' key -> returns parsed dict."""
        thread_data = {**THREAD_FIXTURE, "id": 99, "title": "Detail Thread"}

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/threads/99" in str(request.url)
            return _json_response({"thread": thread_data})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_thread("99")
            assert result["id"] == 99
            assert result["title"] == "Detail Thread"
        finally:
            await adapter.close()

    async def test_get_thread_not_found(self) -> None:
        """404 response -> returns empty dict."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(404, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_thread("999")
            assert result == {}
        finally:
            await adapter.close()


# --- search_threads tests ---


class TestEdDiscussionSearchThreads:
    """Test search_threads method."""

    async def test_search_threads_success(self) -> None:
        """Search returns parsed thread list."""
        search_result = {**THREAD_FIXTURE, "title": "Matching Thread"}

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            assert "search=assignment" in url_str
            return _json_response({"threads": [search_result]})

        adapter = _make_adapter(handler)
        try:
            result = await adapter.search_threads("123", "assignment")
            assert len(result) == 1
            assert result[0]["title"] == "Matching Thread"
        finally:
            await adapter.close()


# --- Token validation tests ---


class TestEdDiscussionValidateToken:
    """Test validate_token method."""

    async def test_validate_token_valid(self) -> None:
        """200 from /courses -> returns True."""

        def handler(request: httpx.Request) -> httpx.Response:
            assert "/courses" in str(request.url)
            return _json_response({"courses": []})

        adapter = _make_adapter(handler)
        try:
            assert await adapter.validate_token() is True
        finally:
            await adapter.close()

    async def test_validate_token_invalid(self) -> None:
        """401 from /courses -> returns False."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            # validate_token calls self._client.get directly (bypasses _request)
            # so 401 doesn't raise TokenInvalidError; it just returns False
            assert await adapter.validate_token() is False
        finally:
            await adapter.close()


# --- Error handling tests ---


class TestEdDiscussionErrors:
    """Test error handling: 401, 403, circuit breaker, retries."""

    async def test_token_invalid_401_raises(self) -> None:
        """401 response raises TokenInvalidError with platform 'Ed Discussion'."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            with pytest.raises(TokenInvalidError) as exc_info:
                await adapter.get_threads("123")
            assert exc_info.value.platform == "Ed Discussion"
        finally:
            await adapter.close()

    async def test_token_invalid_403_raises(self) -> None:
        """403 response raises TokenInvalidError."""

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(403, headers=OK_HEADERS)

        adapter = _make_adapter(handler)
        try:
            with pytest.raises(TokenInvalidError) as exc_info:
                await adapter.get_threads("123")
            assert exc_info.value.platform == "Ed Discussion"
        finally:
            await adapter.close()

    async def test_circuit_breaker_open_raises(self) -> None:
        """OPEN circuit breaker raises UpstreamUnavailableError from _request.

        Note: get_threads catches this and returns [], so we test via _request directly.
        """

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response({"threads": []})

        adapter = _make_adapter(handler)
        # Force circuit to OPEN state
        adapter._circuit.state = CircuitState.OPEN
        adapter._circuit.failure_count = 10
        adapter._circuit.last_failure_time = time.monotonic()
        try:
            with pytest.raises(UpstreamUnavailableError):
                await adapter._request("GET", "/courses/123/threads")
        finally:
            await adapter.close()

    async def test_circuit_breaker_open_get_threads_degrades(self) -> None:
        """OPEN circuit breaker causes get_threads to return [] gracefully."""

        def handler(request: httpx.Request) -> httpx.Response:
            return _json_response({"threads": []})

        adapter = _make_adapter(handler)
        adapter._circuit.state = CircuitState.OPEN
        adapter._circuit.failure_count = 10
        adapter._circuit.last_failure_time = time.monotonic()
        try:
            result = await adapter.get_threads("123")
            assert result == []
        finally:
            await adapter.close()

    async def test_retry_on_429(self) -> None:
        """429 twice then 200 -> retries and returns data."""
        call_count = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                return httpx.Response(429, headers=OK_HEADERS)
            return _json_response({"threads": [THREAD_FIXTURE]})

        adapter = _make_adapter(handler, retry_base_delay=0.01)
        try:
            result = await adapter.get_threads("123")
            assert len(result) == 1
            assert call_count == 3
        finally:
            await adapter.close()

    async def test_retry_on_500(self) -> None:
        """500 twice then 200 -> retries and returns data."""
        call_count = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                return httpx.Response(500, headers=OK_HEADERS)
            return _json_response({"threads": [THREAD_FIXTURE]})

        adapter = _make_adapter(handler, retry_base_delay=0.01)
        try:
            result = await adapter.get_threads("123")
            assert len(result) == 1
            assert call_count == 3
        finally:
            await adapter.close()

    async def test_network_error_graceful(self) -> None:
        """Network error (ConnectError) -> get_threads returns [] gracefully."""

        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("Connection refused")

        adapter = _make_adapter(handler)
        try:
            result = await adapter.get_threads("123")
            assert result == []
        finally:
            await adapter.close()
