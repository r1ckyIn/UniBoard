"""Shared test helpers for unit tests with MockTransport adapters."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from src.web.main import create_app


@pytest.fixture()
def client() -> TestClient:
    """TestClient with mocked DB session for unit tests that hit the full app."""
    app = create_app()
    from src.web.deps import get_session as real_get_session

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock()

    async def override_session():  # type: ignore[no-untyped-def]
        yield mock_session

    app.dependency_overrides[real_get_session] = override_session
    return TestClient(app, raise_server_exceptions=False)


def json_response(
    data: Any,
    status_code: int = 200,
    headers: dict[str, str] | None = None,
    *,
    base_headers: dict[str, str] | None = None,
) -> httpx.Response:
    """Build an httpx.Response with JSON body.

    Args:
        data: JSON-serializable payload.
        status_code: HTTP status code (default 200).
        headers: Extra headers merged on top of base_headers.
        base_headers: Default headers (e.g. rate-limit). Falls back to
            {"content-type": "application/json"} if not provided.
    """
    hdrs = dict(base_headers or {"content-type": "application/json"})
    if headers:
        hdrs.update(headers)
    return httpx.Response(
        status_code,
        content=json.dumps(data).encode(),
        headers=hdrs,
    )
