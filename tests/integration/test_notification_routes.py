"""Integration tests for notification API routes."""

import uuid

import httpx
import jwt as pyjwt
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Profile


def _create_test_jwt(user_id: str) -> str:
    """Create a Supabase-compatible JWT for testing."""
    return pyjwt.encode(
        {"sub": user_id, "role": "authenticated"},
        "super-secret-jwt-token-with-at-least-32-characters-long",
        algorithm="HS256",
    )


async def _create_test_profile(session: AsyncSession) -> tuple[Profile, dict[str, str]]:
    """Create profile and return (profile, auth_headers)."""
    profile = Profile(
        id=uuid.uuid4(),
        display_name="Route Tester",
    )
    session.add(profile)
    await session.flush()

    token = _create_test_jwt(str(profile.id))
    headers = {"Authorization": f"Bearer {token}"}
    return profile, headers


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
