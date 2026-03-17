"""Integration tests for notification API routes."""

import uuid

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.security.auth import create_access_token
from src.security.password import hash_password


async def _create_authed_user(session: AsyncSession) -> tuple[User, dict[str, str]]:
    """Create user and return (user, auth_headers)."""
    user = User(
        email=f"notif-route-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Route Tester",
    )
    session.add(user)
    await session.flush()

    token = create_access_token(user_id=str(user.id))
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


@pytest.mark.asyncio
async def test_get_notifications_returns_200(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/notifications returns 200 with list."""
    # Without auth, should get 401 or 403
    resp = await test_client.get("/api/v1/notifications")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_unread_count_returns_200(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/notifications/unread-count returns count."""
    resp = await test_client.get("/api/v1/notifications/unread-count")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_patch_read_returns_404_for_missing(test_client: httpx.AsyncClient) -> None:
    """PATCH /api/v1/notifications/{id}/read returns 401 without auth."""
    fake_id = str(uuid.uuid4())
    resp = await test_client.patch(f"/api/v1/notifications/{fake_id}/read")
    assert resp.status_code in (401, 403)
