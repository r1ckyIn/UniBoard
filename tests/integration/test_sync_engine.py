"""Integration tests for the sync engine lifecycle, throttle, and token expiry."""

import uuid
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.common import TokenInvalidError
from src.security.password import hash_password


@pytest_asyncio.fixture(loop_scope="session")
async def _sync_user(session: AsyncSession) -> User:
    """Create a user with encrypted Canvas token for sync tests."""
    user = User(
        email=f"sync-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Sync Test User",
        canvas_api_token_encrypted="fake-encrypted-token",
        canvas_token_status="active",
        canvas_sync_status="pending",
    )
    session.add(user)
    await session.flush()
    return user


@pytest.mark.asyncio(loop_scope="session")
async def test_sync_status_endpoint(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/sync/status returns per-source status."""
    # Register + login
    email = f"syncstatus-{uuid.uuid4().hex[:8]}@test.com"
    await test_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "display_name": "Test"},
    )
    login_resp = await test_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass123"},
    )
    token = login_resp.json()["data"]["access_token"]

    resp = await test_client.get(
        "/api/v1/sync/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "sources" in data
    assert len(data["sources"]) == 2
    assert data["sources"][0]["platform"] in ("canvas", "ed")
    assert "is_syncing" in data


@pytest.mark.asyncio(loop_scope="session")
async def test_manual_sync_trigger(test_client: httpx.AsyncClient) -> None:
    """POST /api/v1/sync/trigger returns 200 on first call."""
    email = f"synctrig-{uuid.uuid4().hex[:8]}@test.com"
    await test_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "display_name": "Test"},
    )
    login_resp = await test_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass123"},
    )
    token = login_resp.json()["data"]["access_token"]

    resp = await test_client.post(
        "/api/v1/sync/trigger",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["message"] == "Sync triggered successfully"
    assert "next_allowed_at" in data


@pytest.mark.asyncio(loop_scope="session")
async def test_manual_sync_throttle(test_client: httpx.AsyncClient) -> None:
    """POST /api/v1/sync/trigger twice within 5 min, second returns 429."""
    email = f"syncthrot-{uuid.uuid4().hex[:8]}@test.com"
    await test_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "display_name": "Test"},
    )
    login_resp = await test_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass123"},
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First call should succeed
    resp1 = await test_client.post("/api/v1/sync/trigger", headers=headers)
    assert resp1.status_code == 200

    # Second call within 5 minutes should be throttled
    resp2 = await test_client.post("/api/v1/sync/trigger", headers=headers)
    assert resp2.status_code == 429


@pytest.mark.asyncio(loop_scope="session")
async def test_token_expiry_detection(session: AsyncSession) -> None:
    """Sync sets canvas_token_status='expired' when adapter raises TokenInvalidError."""
    # Create user with fake encrypted token
    user = User(
        email=f"expiry-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Expiry Test",
        canvas_api_token_encrypted="fake-encrypted-token",
        canvas_token_status="active",
        canvas_sync_status="pending",
    )
    session.add(user)
    await session.flush()

    # Simulate the token expiry flow directly via _sync_user_grades
    from src.sync.tasks import _sync_user_grades

    # Patch CanvasAdapter where it's imported (local import inside _sync_user_grades)
    with patch("src.adapters.canvas.CanvasAdapter") as mock_adapter_cls:
        mock_adapter = AsyncMock()
        mock_adapter.get_courses.side_effect = TokenInvalidError("Canvas")
        mock_adapter.close = AsyncMock()
        mock_adapter_cls.return_value = mock_adapter

        await _sync_user_grades(user, "fake-token", session)

    # Verify state transition
    assert user.canvas_token_status == "expired"
    assert user.canvas_sync_status == "degraded"
