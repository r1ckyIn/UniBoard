"""Tests for per-user API rate limiting via slowapi."""

import time
import uuid
from unittest.mock import MagicMock

import jwt as pyjwt
import pytest
from fastapi import Request
from starlette.testclient import TestClient

from src.config import Settings


def _make_auth_header(user_id: str | None = None) -> dict[str, str]:
    """Create a valid JWT Authorization header for testing."""
    settings = Settings(_env_file=None)
    uid = user_id or str(uuid.uuid4())
    payload = {
        "sub": uid,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    token = pyjwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _make_mock_request(
    auth_header: str | None = None,
    client_host: str = "127.0.0.1",
) -> Request:
    """Build a mock Request with optional Authorization header."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
    }
    if auth_header:
        scope["headers"] = [(b"authorization", auth_header.encode())]
    req = Request(scope)
    # Attach mock client
    req._client = MagicMock()  # type: ignore[attr-defined]
    req._client.host = client_host  # type: ignore[attr-defined]
    # Override client property
    req.scope["client"] = (client_host, 0)
    return req


class TestKeyFunc:
    """Unit tests for the get_user_id_or_ip key extraction function."""

    def test_key_func_with_valid_jwt(self) -> None:
        """Extracts user:{uuid} from a valid Bearer token."""
        from src.web.rate_limit import get_user_id_or_ip

        uid = str(uuid.uuid4())
        headers = _make_auth_header(uid)
        req = _make_mock_request(auth_header=headers["Authorization"])
        result = get_user_id_or_ip(req)
        assert result == f"user:{uid}"

    def test_key_func_without_auth(self) -> None:
        """Falls back to ip:{address} when no Authorization header present."""
        from src.web.rate_limit import get_user_id_or_ip

        req = _make_mock_request(client_host="10.0.0.1")
        result = get_user_id_or_ip(req)
        assert result == "ip:10.0.0.1"

    def test_key_func_with_invalid_jwt(self) -> None:
        """Falls back to IP when JWT is malformed."""
        from src.web.rate_limit import get_user_id_or_ip

        req = _make_mock_request(
            auth_header="Bearer invalid.jwt.token",
            client_host="192.168.1.1",
        )
        result = get_user_id_or_ip(req)
        assert result == "ip:192.168.1.1"


class TestRateLimitIntegration:
    """Integration tests for rate limiting using TestClient."""

    @pytest.fixture()
    def client(self) -> TestClient:
        """Create a TestClient from the real app."""
        from src.web.main import create_app

        return TestClient(create_app(), raise_server_exceptions=False)

    def test_general_rate_limit(self, client: TestClient) -> None:
        """General endpoints return 429 after exceeding 60 requests per user per minute."""
        uid = str(uuid.uuid4())
        headers = _make_auth_header(uid)
        # Send 61 requests to a general endpoint -- most will return 401/422
        # since there's no real DB, but rate limiter kicks in at 61
        responses = []
        for _ in range(61):
            resp = client.get("/api/v1/users/me", headers=headers)
            responses.append(resp.status_code)

        # The 61st request should be rate-limited
        assert 429 in responses, "Expected at least one 429 response after 60 requests"

    def test_rate_limit_429_response_format(self, client: TestClient) -> None:
        """429 response body contains JSON with error.code = RATE_LIMITED."""
        uid = str(uuid.uuid4())
        headers = _make_auth_header(uid)
        # Trigger 429 by exceeding limit
        for _ in range(61):
            resp = client.get("/api/v1/users/me", headers=headers)
            if resp.status_code == 429:
                body = resp.json()
                assert body["error"]["code"] == "RATE_LIMITED"
                assert "meta" in body
                assert "request_id" in body["meta"]
                return
        pytest.fail("Never received 429 after 61 requests")

    def test_ai_rate_limit(self, client: TestClient) -> None:
        """AI endpoints return 429 after exceeding 10 requests per user per minute."""
        uid = str(uuid.uuid4())
        course_id = str(uuid.uuid4())
        headers = _make_auth_header(uid)
        responses = []
        for _ in range(11):
            resp = client.get(
                f"/api/v1/courses/{course_id}/review",
                headers=headers,
            )
            responses.append(resp.status_code)
        assert 429 in responses, "Expected 429 after 10 AI requests"

    def test_health_exempt(self, client: TestClient) -> None:
        """Health endpoint is exempt from rate limiting -- no 429 even after many requests."""
        for _ in range(70):
            resp = client.get("/health")
            assert resp.status_code != 429, "Health endpoint should be exempt from rate limiting"
