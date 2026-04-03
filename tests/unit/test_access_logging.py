"""Tests for access logging middleware with request_id propagation."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.web.main import create_app


@pytest.fixture()
def client() -> TestClient:
    """Create a test client from the full application."""
    app = create_app()

    # Override DB session to avoid real database connection
    from src.web.deps import get_session as real_get_session

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock()

    async def override_session():  # type: ignore[no-untyped-def]
        yield mock_session

    app.dependency_overrides[real_get_session] = override_session
    return TestClient(app, raise_server_exceptions=False)


class TestAccessLogging:
    """Verify access logging middleware behavior."""

    def test_request_id_header_present(self, client: TestClient) -> None:
        """Response includes X-Request-ID header."""
        response = client.get("/health")
        request_id = response.headers.get("X-Request-ID")
        assert request_id is not None
        assert len(request_id) > 0

    @patch("src.web.main.structlog.contextvars.clear_contextvars")
    @patch("src.web.main.structlog.contextvars.bind_contextvars")
    def test_contextvars_bound_per_request(
        self,
        mock_bind: AsyncMock,
        mock_clear: AsyncMock,
        client: TestClient,
    ) -> None:
        """Middleware clears and binds contextvars with request_id."""
        response = client.get("/health")
        assert response.status_code in (200, 503)

        mock_clear.assert_called()
        mock_bind.assert_called()
        # Verify request_id was passed to bind_contextvars
        call_kwargs = mock_bind.call_args
        assert "request_id" in call_kwargs.kwargs

    @patch("src.web.main.logger")
    def test_http_request_logged(
        self,
        mock_logger: AsyncMock,
        client: TestClient,
    ) -> None:
        """Middleware logs http_request event with required fields."""
        response = client.get("/health")
        assert response.status_code in (200, 503)

        # Find the http_request log call
        info_calls = mock_logger.info.call_args_list
        http_calls = [c for c in info_calls if c.args and c.args[0] == "http_request"]
        assert len(http_calls) >= 1, f"Expected http_request log, got: {info_calls}"

        call = http_calls[0]
        assert call.kwargs["method"] == "GET"
        assert call.kwargs["path"] == "/health"
        assert "status_code" in call.kwargs
        assert "duration_ms" in call.kwargs
        assert isinstance(call.kwargs["duration_ms"], float)
