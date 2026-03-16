"""Integration tests for the complete auth flow.

All tests run against real PostgreSQL with per-test transaction rollback.
No mocks -- pure integration tests.
"""

from datetime import timedelta
from uuid import uuid4

import httpx
import pytest

from src.security.auth import create_access_token


def _unique_email() -> str:
    """Generate a unique test email to avoid conflicts between tests."""
    return f"test_{uuid4().hex[:8]}@example.com"


async def _register_user(
    client: httpx.AsyncClient,
    email: str | None = None,
    password: str = "testpass123",
    display_name: str = "Test User",
) -> httpx.Response:
    """Helper: register a user and return the response."""
    return await client.post(
        "/api/v1/auth/register",
        json={
            "email": email or _unique_email(),
            "password": password,
            "display_name": display_name,
        },
    )


async def _login_user(
    client: httpx.AsyncClient,
    email: str,
    password: str = "testpass123",
) -> httpx.Response:
    """Helper: login and return the response."""
    return await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )


async def _register_and_login(
    client: httpx.AsyncClient,
    email: str | None = None,
    password: str = "testpass123",
    display_name: str = "Test User",
) -> tuple[str, str, str]:
    """Helper: register + login, return (email, access_token, refresh_token)."""
    actual_email = email or _unique_email()
    await _register_user(client, actual_email, password, display_name)
    login_resp = await _login_user(client, actual_email, password)
    data = login_resp.json()["data"]
    return actual_email, data["access_token"], data["refresh_token"]


# --- Test 1: Register Success ---


@pytest.mark.asyncio
async def test_register_success(test_client: httpx.AsyncClient) -> None:
    """POST /api/v1/auth/register with valid data returns 201."""
    email = _unique_email()
    resp = await _register_user(test_client, email=email)

    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["email"] == email
    assert body["data"]["display_name"] == "Test User"
    assert "user_id" in body["data"]
    assert "request_id" in body["meta"]
    assert "timestamp" in body["meta"]


# --- Test 2: Duplicate Email ---


@pytest.mark.asyncio
async def test_register_duplicate_email(test_client: httpx.AsyncClient) -> None:
    """Registering the same email twice returns 409 CONFLICT."""
    email = _unique_email()
    resp1 = await _register_user(test_client, email=email)
    assert resp1.status_code == 201

    resp2 = await _register_user(test_client, email=email)
    assert resp2.status_code == 409
    assert resp2.json()["error"]["code"] == "CONFLICT"


# --- Test 3: Short Password ---


@pytest.mark.asyncio
async def test_register_short_password(test_client: httpx.AsyncClient) -> None:
    """Password shorter than 8 chars returns 422 validation error."""
    resp = await _register_user(test_client, password="short")
    assert resp.status_code == 422


# --- Test 4: Login Success ---


@pytest.mark.asyncio
async def test_login_success(test_client: httpx.AsyncClient) -> None:
    """Login with valid credentials returns 200 with JWT tokens."""
    email = _unique_email()
    await _register_user(test_client, email=email)

    resp = await _login_user(test_client, email=email)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


# --- Test 5: Login Wrong Password ---


@pytest.mark.asyncio
async def test_login_wrong_password(test_client: httpx.AsyncClient) -> None:
    """Login with wrong password returns 401."""
    email = _unique_email()
    await _register_user(test_client, email=email)

    resp = await _login_user(test_client, email=email, password="wrongpass123")
    assert resp.status_code == 401


# --- Test 6: Login Non-Existent Email ---


@pytest.mark.asyncio
async def test_login_nonexistent_email(test_client: httpx.AsyncClient) -> None:
    """Login with non-existent email returns 401 (same as wrong password)."""
    resp = await _login_user(test_client, email="nobody@example.com")
    assert resp.status_code == 401


# --- Test 7: Protected Endpoint With Token ---


@pytest.mark.asyncio
async def test_protected_endpoint_with_token(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/users/me with valid Bearer token returns 200."""
    email, access_token, _ = await _register_and_login(test_client)

    resp = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == email


# --- Test 8: Protected Endpoint Without Token ---


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/users/me without Authorization header returns 401."""
    resp = await test_client.get("/api/v1/users/me")
    assert resp.status_code == 401


# --- Test 9: Protected Endpoint With Expired Token ---


@pytest.mark.asyncio
async def test_protected_endpoint_expired_token(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/users/me with expired token returns 401."""
    email, _, _ = await _register_and_login(test_client)

    # Create an already-expired token
    expired_token = create_access_token(
        {"sub": "fake-id"},
        expires_delta=timedelta(seconds=-1),
    )

    resp = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401


# --- Test 10: Protected Endpoint With Invalid Token ---


@pytest.mark.asyncio
async def test_protected_endpoint_invalid_token(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /api/v1/users/me with garbage token returns 401."""
    resp = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer garbage-token"},
    )
    assert resp.status_code == 401


# --- Test 11: Refresh Token Success ---


@pytest.mark.asyncio
async def test_refresh_token_success(test_client: httpx.AsyncClient) -> None:
    """POST /api/v1/auth/refresh with valid refresh_token returns new access_token."""
    _, access_token, refresh_token = await _register_and_login(test_client)

    resp = await test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    new_access_token = data["access_token"]
    assert new_access_token != access_token  # Should be different

    # Verify new access token works
    profile_resp = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert profile_resp.status_code == 200


# --- Test 12: Refresh With Access Token Rejected ---


@pytest.mark.asyncio
async def test_refresh_with_access_token_rejected(
    test_client: httpx.AsyncClient,
) -> None:
    """POST /api/v1/auth/refresh with access_token (wrong type) returns 401."""
    _, access_token, _ = await _register_and_login(test_client)

    resp = await test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert resp.status_code == 401


# --- Test 13: Update User Profile ---


@pytest.mark.asyncio
async def test_update_user_profile(test_client: httpx.AsyncClient) -> None:
    """PATCH /api/v1/users/me updates profile fields."""
    _, access_token, _ = await _register_and_login(test_client)

    # Update display_name
    resp = await test_client.patch(
        "/api/v1/users/me",
        json={"display_name": "Updated Name"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200

    # Verify update persisted
    profile_resp = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert profile_resp.json()["data"]["display_name"] == "Updated Name"


# --- Test 14: Health Check ---


@pytest.mark.asyncio
async def test_health_check(test_client: httpx.AsyncClient) -> None:
    """GET /health returns 200 with database connectivity status."""
    resp = await test_client.get("/health")
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


# --- Test 15: Full Auth Flow (SC-2 Validation) ---


@pytest.mark.asyncio
async def test_full_auth_flow(test_client: httpx.AsyncClient) -> None:
    """End-to-end: Register -> Login -> GET /users/me -> Refresh -> GET /users/me.

    This is the SC-2 validation test: "A user can register with email/password
    and receive a JWT token; the token authenticates subsequent API requests."
    """
    email = _unique_email()

    # Step 1: Register
    reg_resp = await _register_user(test_client, email=email)
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["data"]["user_id"]

    # Step 2: Login
    login_resp = await _login_user(test_client, email=email)
    assert login_resp.status_code == 200
    tokens = login_resp.json()["data"]
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # Step 3: GET /users/me with access token
    profile_resp = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert profile_resp.status_code == 200
    profile = profile_resp.json()["data"]
    assert profile["email"] == email
    assert profile["id"] == user_id

    # Step 4: Refresh token
    refresh_resp = await test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    new_access_token = refresh_resp.json()["data"]["access_token"]

    # Step 5: GET /users/me with new access token
    profile_resp2 = await test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert profile_resp2.status_code == 200
    assert profile_resp2.json()["data"]["email"] == email
