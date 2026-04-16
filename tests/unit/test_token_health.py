"""Unit tests for check_token_health -- PLAT-04 + EMAIL-03 recall emails."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.user import Profile

# Fixed reference "now" used for EMAIL-03 recall-branch tests.
REFERENCE = datetime(2026, 4, 15, tzinfo=UTC)


def _make_profile(
    *,
    canvas_status: str = "active",
    ed_status: str = "active",
    last_sync_at: datetime | None = None,
    recall_email_sent_at: datetime | None = None,
    display_name: str = "Test User",
) -> Profile:
    """Build a mock Profile with token status fields."""
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.canvas_token_status = canvas_status
    profile.ed_token_status = ed_status
    profile.last_sync_at = last_sync_at
    profile.recall_email_sent_at = recall_email_sent_at
    profile.display_name = display_name
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
@patch("src.sync.scheduled._get_sync_session_factory")
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

        from src.sync.scheduled import check_token_health

        await check_token_health()

        # Should create exactly 1 notification (Canvas only, Ed is active)
        assert mock_svc.create_notification.call_count == 1
        call_kwargs = mock_svc.create_notification.call_args
        assert call_kwargs[1]["notification_type"] == "token_expiry"
        assert "Canvas" in call_kwargs[1]["title"]
        assert call_kwargs[1]["action_url"] == "/settings#tokens"


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
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

        from src.sync.scheduled import check_token_health

        await check_token_health()

        assert mock_svc.create_notification.call_count == 2
        titles = [
            call[1]["title"]
            for call in mock_svc.create_notification.call_args_list
        ]
        assert any("Canvas" in t for t in titles)
        assert any("Ed" in t for t in titles)


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
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

    with patch("src.sync.scheduled.RecallEmailService") as MockRecall:
        mock_recall = MagicMock()
        mock_recall.send_recall = AsyncMock()
        MockRecall.return_value = mock_recall

        from src.sync.scheduled import check_token_health

        await check_token_health()
        # Should return early, no error, RecallEmailService never instantiated
        MockRecall.assert_not_called()


# ----------------------------------------------------------------------
# EMAIL-03 recall-email branch — Tests B-F
# ----------------------------------------------------------------------


def _build_two_sessions(profile: Profile, last_sign_in_at: datetime | None):
    """Build a 3-session factory: query, notify, recall. Returns factory_fn.

    Session usage order inside check_token_health:
        1. Query expired profiles  (top-level)
        2. Per-user notification session
        3. Per-user recall-email session (auth.users select + recall send)
    """
    # Session 1: top-level SELECT of expired profiles
    session1 = AsyncMock()
    result1 = MagicMock()
    result1.scalars.return_value.all.return_value = [profile]
    session1.execute = AsyncMock(return_value=result1)

    # Session 2: notification loop
    session2 = AsyncMock()
    session2.commit = AsyncMock()

    # Session 3: recall-email branch (auth.users select)
    session3 = AsyncMock()
    auth_row = SimpleNamespace(last_sign_in_at=last_sign_in_at)
    auth_result = MagicMock()
    auth_result.first.return_value = auth_row
    session3.execute = AsyncMock(return_value=auth_result)
    session3.commit = AsyncMock()

    sessions = [session1, session2, session3]
    idx = {"i": 0}

    def _factory() -> _SessionCtx:
        i = min(idx["i"], len(sessions) - 1)
        idx["i"] += 1
        return _SessionCtx(sessions[i])

    return MagicMock(side_effect=_factory)


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_b_expired_but_not_absent_skips_recall(
    mock_factory_fn: MagicMock,
) -> None:
    """Test B: expired token but recent sign-in -> send_recall NOT called."""
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=REFERENCE - timedelta(days=20),
        recall_email_sent_at=None,
    )
    # last_sign_in recent (<14d ago)
    mock_factory_fn.return_value = _build_two_sessions(
        profile, last_sign_in_at=REFERENCE - timedelta(days=5)
    )

    with (
        patch("src.services.notification.NotificationService") as MockNotifSvc,
        patch("src.sync.scheduled.RecallEmailService") as MockRecall,
    ):
        mock_svc = MagicMock()
        mock_svc.create_notification = AsyncMock()
        MockNotifSvc.return_value = mock_svc

        mock_recall = MagicMock()
        mock_recall.send_recall = AsyncMock()
        MockRecall.return_value = mock_recall

        from src.sync.scheduled import check_token_health

        await check_token_health(now=REFERENCE)

        MockRecall.assert_not_called()
        mock_recall.send_recall.assert_not_called()


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_c_absent_expired_sends_recall(
    mock_factory_fn: MagicMock,
) -> None:
    """Test C: absent expired-token user with no prior recall -> send once."""
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=REFERENCE - timedelta(days=20),
        recall_email_sent_at=None,
    )
    mock_factory_fn.return_value = _build_two_sessions(
        profile, last_sign_in_at=REFERENCE - timedelta(days=20)
    )

    with (
        patch("src.services.notification.NotificationService") as MockNotifSvc,
        patch("src.sync.scheduled.RecallEmailService") as MockRecall,
    ):
        mock_svc = MagicMock()
        mock_svc.create_notification = AsyncMock()
        MockNotifSvc.return_value = mock_svc

        mock_recall = MagicMock()
        mock_recall.send_recall = AsyncMock(return_value=True)
        MockRecall.return_value = mock_recall

        from src.sync.scheduled import check_token_health

        await check_token_health(now=REFERENCE)

        assert mock_recall.send_recall.call_count == 1


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_d_rate_limited_skips_recall(
    mock_factory_fn: MagicMock,
) -> None:
    """Test D: recall sent <30d ago -> send_recall NOT called."""
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=REFERENCE - timedelta(days=20),
        recall_email_sent_at=REFERENCE - timedelta(days=10),
    )
    mock_factory_fn.return_value = _build_two_sessions(
        profile, last_sign_in_at=REFERENCE - timedelta(days=20)
    )

    with (
        patch("src.services.notification.NotificationService") as MockNotifSvc,
        patch("src.sync.scheduled.RecallEmailService") as MockRecall,
    ):
        mock_svc = MagicMock()
        mock_svc.create_notification = AsyncMock()
        MockNotifSvc.return_value = mock_svc

        mock_recall = MagicMock()
        mock_recall.send_recall = AsyncMock()
        MockRecall.return_value = mock_recall

        from src.sync.scheduled import check_token_health

        await check_token_health(now=REFERENCE)

        mock_recall.send_recall.assert_not_called()


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_e_recall_failure_does_not_propagate(
    mock_factory_fn: MagicMock,
) -> None:
    """Test E: send_recall raises -> check_token_health still completes."""
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=REFERENCE - timedelta(days=20),
        recall_email_sent_at=None,
    )
    mock_factory_fn.return_value = _build_two_sessions(
        profile, last_sign_in_at=REFERENCE - timedelta(days=20)
    )

    with (
        patch("src.services.notification.NotificationService") as MockNotifSvc,
        patch("src.sync.scheduled.RecallEmailService") as MockRecall,
    ):
        mock_svc = MagicMock()
        mock_svc.create_notification = AsyncMock()
        MockNotifSvc.return_value = mock_svc

        mock_recall = MagicMock()
        mock_recall.send_recall = AsyncMock(side_effect=RuntimeError("SES down"))
        MockRecall.return_value = mock_recall

        from src.sync.scheduled import check_token_health

        # Must not raise
        await check_token_health(now=REFERENCE)


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_f_now_kwarg_accepted(
    mock_factory_fn: MagicMock,
) -> None:
    """Test F: check_token_health(now=...) accepts the kwarg without TypeError."""
    # No expired users -> fastest path; just prove the signature.
    session1 = AsyncMock()
    result1 = MagicMock()
    result1.scalars.return_value.all.return_value = []
    session1.execute = AsyncMock(return_value=result1)

    mock_factory_fn.return_value = MagicMock(
        side_effect=lambda: _SessionCtx(session1)
    )

    from src.sync.scheduled import check_token_health

    await check_token_health(now=REFERENCE)  # must not raise TypeError
