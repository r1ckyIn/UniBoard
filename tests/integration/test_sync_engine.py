"""Integration tests for sync engine lifecycle, throttle, token expiry, and sync history.

Migrated from User+password to Profile+JWT auth (Phase 13 User->Profile migration).
"""

import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.models.sync_history import SyncHistory
from src.models.user import Profile
from src.schemas.common import TokenInvalidError


def _create_test_jwt(user_id: str) -> str:
    """Create a valid Supabase-compatible JWT for test authentication."""
    import time

    import jwt

    from src.config import get_settings

    settings = get_settings()
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "iss": "supabase-test",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


@asynccontextmanager
async def _get_test_session(
    client: httpx.AsyncClient,
) -> AsyncGenerator[AsyncSession, None]:
    """Extract the test session from the client's app dependency override."""
    app = client._transport.app  # type: ignore[union-attr]
    override_fn = app.dependency_overrides[get_session]
    gen = override_fn()
    session = await gen.__anext__()
    try:
        yield session
    finally:
        await gen.aclose()


async def _create_test_profile_and_jwt(
    session: AsyncSession,
    *,
    display_name: str = "Sync Test User",
    canvas_token: str | None = "fake-encrypted-token",
    canvas_token_status: str = "active",
    canvas_sync_status: str = "pending",
) -> tuple[uuid.UUID, str]:
    """Create a Profile in the test session and return (user_id, jwt_token)."""
    user_id = uuid.uuid4()
    profile = Profile(
        id=user_id,
        display_name=display_name,
        canvas_api_token_encrypted=canvas_token,
        canvas_token_status=canvas_token_status,
        canvas_sync_status=canvas_sync_status,
    )
    session.add(profile)
    await session.flush()
    token = _create_test_jwt(str(user_id))
    return user_id, token


# ===========================================================================
# Existing tests (fixed: Profile + JWT instead of User + password)
# ===========================================================================


async def test_sync_status_endpoint(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/sync/status returns per-source status."""
    async with _get_test_session(test_client) as test_session:
        _, token = await _create_test_profile_and_jwt(test_session)
        headers = {"Authorization": f"Bearer {token}"}

        resp = await test_client.get("/api/v1/sync/status", headers=headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "last_sync" in data
        assert data["last_sync"]["status"] in ("in_progress", "completed", "failed")
        assert "platforms" in data
        assert "canvas" in data["platforms"]
        assert "ed" in data["platforms"]


async def test_manual_sync_trigger(test_client: httpx.AsyncClient) -> None:
    """POST /api/v1/sync/trigger returns 200 on first call."""
    async with _get_test_session(test_client) as test_session:
        _, token = await _create_test_profile_and_jwt(test_session)
        headers = {"Authorization": f"Bearer {token}"}

        resp = await test_client.post("/api/v1/sync/trigger", headers=headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "Sync triggered successfully" in data["message"]
        assert "next_allowed_at" in data


async def test_manual_sync_throttle(test_client: httpx.AsyncClient) -> None:
    """POST /api/v1/sync/trigger twice within 5 min, second returns 429."""
    async with _get_test_session(test_client) as test_session:
        _, token = await _create_test_profile_and_jwt(test_session)
        headers = {"Authorization": f"Bearer {token}"}

        # First call should succeed
        resp1 = await test_client.post("/api/v1/sync/trigger", headers=headers)
        assert resp1.status_code == 200

        # Second call within 5 minutes should be throttled
        resp2 = await test_client.post("/api/v1/sync/trigger", headers=headers)
        assert resp2.status_code == 429


async def test_token_expiry_detection(test_client: httpx.AsyncClient) -> None:
    """Sync sets canvas_token_status='expired' when adapter raises TokenInvalidError."""
    async with _get_test_session(test_client) as test_session:
        user_id = uuid.uuid4()
        profile = Profile(
            id=user_id,
            display_name="Expiry Test",
            canvas_api_token_encrypted="fake-encrypted-token",
            canvas_token_status="active",
            canvas_sync_status="pending",
        )
        test_session.add(profile)
        await test_session.flush()

        # Simulate the token expiry flow directly via _sync_user_grades
        from src.sync.grades import _sync_user_grades

        with patch("src.adapters.canvas.CanvasAdapter") as mock_adapter_cls:
            mock_adapter = AsyncMock()
            mock_adapter.get_courses.side_effect = TokenInvalidError("Canvas")
            mock_adapter.close = AsyncMock()
            mock_adapter_cls.return_value = mock_adapter

            await _sync_user_grades(profile, "fake-token", test_session)

        # Verify state transition
        assert profile.canvas_token_status == "expired"
        assert profile.canvas_sync_status == "degraded"


# ===========================================================================
# New tests: sync history endpoint
# ===========================================================================


async def test_sync_history_endpoint(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/sync/history returns sync history entries."""
    async with _get_test_session(test_client) as test_session:
        user_id, token = await _create_test_profile_and_jwt(test_session)
        headers = {"Authorization": f"Bearer {token}"}

        # Insert a SyncHistory row directly
        now = datetime.now(UTC).replace(tzinfo=None)
        history = SyncHistory(
            user_id=user_id,
            domain="grades",
            status="success",
            records_updated=15,
            started_at=now,
            completed_at=now,
        )
        test_session.add(history)
        await test_session.flush()

        resp = await test_client.get("/api/v1/sync/history", headers=headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "entries" in data
        assert len(data["entries"]) >= 1

        # Verify first entry has expected fields
        entry = data["entries"][0]
        assert entry["domain"] == "grades"
        assert entry["status"] == "success"
        assert entry["records_updated"] == 15
        assert "started_at" in entry
        assert "completed_at" in entry


async def test_sync_history_filter_by_domain(test_client: httpx.AsyncClient) -> None:
    """GET /api/v1/sync/history?domain=grades filters entries."""
    async with _get_test_session(test_client) as test_session:
        user_id, token = await _create_test_profile_and_jwt(test_session)
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(UTC).replace(tzinfo=None)

        # Insert rows for different domains
        for domain in ("grades", "deadlines", "modules"):
            entry = SyncHistory(
                user_id=user_id,
                domain=domain,
                status="success",
                records_updated=10,
                started_at=now,
                completed_at=now,
            )
            test_session.add(entry)
        await test_session.flush()

        # Filter by domain=grades
        resp = await test_client.get(
            "/api/v1/sync/history?domain=grades", headers=headers
        )
        assert resp.status_code == 200
        entries = resp.json()["data"]["entries"]
        assert len(entries) >= 1
        for entry in entries:
            assert entry["domain"] == "grades"
