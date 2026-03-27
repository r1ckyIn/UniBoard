"""Unit tests for check_token_health -- PLAT-04 token expiry warnings."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.user import Profile


def _make_profile(
    *,
    canvas_status: str = "active",
    ed_status: str = "active",
) -> Profile:
    """Build a mock Profile with token status fields."""
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.canvas_token_status = canvas_status
    profile.ed_token_status = ed_status
    return profile


class _SessionCtx:
    """Async context manager returning a mock session."""

    def __init__(self, session: AsyncMock) -> None:
        self._session = session

    async def __aenter__(self) -> AsyncMock:
        return self._session

    async def __aexit__(self, *args: object) -> None:
        pass


@pytest.mark.asyncio
@patch("src.sync.tasks._get_sync_session_factory")
async def test_expired_canvas_token_creates_notification(
    mock_factory_fn: MagicMock,
) -> None:
    """Profile with canvas_token_status='expired' gets a token_expiry notification."""
    profile = _make_profile(canvas_status="expired", ed_status="active")

    # Session 1: query for expired profiles
    session1 = AsyncMock()
    result1 = MagicMock()
    result1.scalars.return_value.all.return_value = [profile]
    session1.execute = AsyncMock(return_value=result1)

    # Session 2: per-user notification session
    session2 = AsyncMock()
    session2.commit = AsyncMock()

    sessions = [session1, session2]
    idx = {"i": 0}

    def _factory() -> _SessionCtx:
        i = min(idx["i"], len(sessions) - 1)
        idx["i"] += 1
        return _SessionCtx(sessions[i])

    mock_factory_fn.return_value = MagicMock(side_effect=_factory)

    with patch("src.services.notification.NotificationService") as MockNotifSvc:
        mock_svc = MagicMock()
        mock_svc.create_notification = AsyncMock(return_value=MagicMock())
        MockNotifSvc.return_value = mock_svc

        from src.sync.tasks import check_token_health

        await check_token_health()

        # Should create exactly 1 notification (Canvas only, Ed is active)
        assert mock_svc.create_notification.call_count == 1
        call_kwargs = mock_svc.create_notification.call_args
        assert call_kwargs[1]["notification_type"] == "token_expiry"
        assert "Canvas" in call_kwargs[1]["title"]
        assert call_kwargs[1]["action_url"] == "/settings#tokens"


@pytest.mark.asyncio
@patch("src.sync.tasks._get_sync_session_factory")
async def test_both_tokens_expired_creates_two_notifications(
    mock_factory_fn: MagicMock,
) -> None:
    """Profile with both tokens expired gets 2 notifications."""
    profile = _make_profile(canvas_status="expired", ed_status="expired")

    session1 = AsyncMock()
    result1 = MagicMock()
    result1.scalars.return_value.all.return_value = [profile]
    session1.execute = AsyncMock(return_value=result1)

    session2 = AsyncMock()
    session2.commit = AsyncMock()

    sessions = [session1, session2]
    idx = {"i": 0}

    def _factory() -> _SessionCtx:
        i = min(idx["i"], len(sessions) - 1)
        idx["i"] += 1
        return _SessionCtx(sessions[i])

    mock_factory_fn.return_value = MagicMock(side_effect=_factory)

    with patch("src.services.notification.NotificationService") as MockNotifSvc:
        mock_svc = MagicMock()
        mock_svc.create_notification = AsyncMock(return_value=MagicMock())
        MockNotifSvc.return_value = mock_svc

        from src.sync.tasks import check_token_health

        await check_token_health()

        assert mock_svc.create_notification.call_count == 2
        titles = [
            call[1]["title"]
            for call in mock_svc.create_notification.call_args_list
        ]
        assert any("Canvas" in t for t in titles)
        assert any("Ed" in t for t in titles)


@pytest.mark.asyncio
@patch("src.sync.tasks._get_sync_session_factory")
async def test_no_expired_tokens_skips_notifications(
    mock_factory_fn: MagicMock,
) -> None:
    """No expired tokens means no notifications created."""
    # Query returns empty list (no profiles with expired tokens)
    session1 = AsyncMock()
    result1 = MagicMock()
    result1.scalars.return_value.all.return_value = []
    session1.execute = AsyncMock(return_value=result1)

    mock_factory_fn.return_value = MagicMock(
        side_effect=lambda: _SessionCtx(session1)
    )

    from src.sync.tasks import check_token_health

    await check_token_health()
    # Should return early, no error
