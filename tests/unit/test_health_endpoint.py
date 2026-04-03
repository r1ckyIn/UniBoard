"""Tests for health endpoint 503 behavior when database is degraded."""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.web.routes.health import router


@pytest.fixture()
def app() -> FastAPI:
    """Create a minimal FastAPI app with the health router."""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture()
def client(app: FastAPI) -> TestClient:
    """Create a test client."""
    return TestClient(app)


class TestHealthEndpoint:
    """Health endpoint returns correct status codes."""

    def test_healthy_returns_200(self, client: TestClient) -> None:
        """When database is reachable, return 200 with status=healthy."""
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()

        from src.web.deps import get_session as real_get_session

        app = client.app
        assert isinstance(app, FastAPI)

        async def override_session():  # type: ignore[no-untyped-def]
            yield mock_session

        app.dependency_overrides[real_get_session] = override_session
        response = client.get("/health")
        app.dependency_overrides.clear()

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert body["database"] == "connected"
        assert "timestamp" in body

    def test_degraded_returns_503(self, client: TestClient) -> None:
        """When database is unreachable, return 503 with status=degraded."""
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=Exception("Connection refused"))

        from src.web.deps import get_session as real_get_session

        app = client.app
        assert isinstance(app, FastAPI)

        async def override_session():  # type: ignore[no-untyped-def]
            yield mock_session

        app.dependency_overrides[real_get_session] = override_session
        response = client.get("/health")
        app.dependency_overrides.clear()

        assert response.status_code == 503
        body = response.json()
        assert body["status"] == "degraded"
        assert body["database"] == "disconnected"
        assert "timestamp" in body
