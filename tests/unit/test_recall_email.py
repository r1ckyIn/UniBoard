"""Unit tests for RecallEmailService and should_send_recall_email (EMAIL-03)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.user import Profile
from src.services.recall_email import (
    RecallEmailService,
    should_send_recall_email,
)

# Fixed reference "now" used across all tests — eliminates freezegun dependency.
NOW = datetime(2026, 4, 15, tzinfo=UTC)


def _make_profile(
    *,
    canvas_status: str = "active",
    ed_status: str = "active",
    last_sync_at: datetime | None = None,
    recall_email_sent_at: datetime | None = None,
    display_name: str = "Test User",
) -> Profile:
    """Build a MagicMock Profile — bypasses ORM construction."""
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.canvas_token_status = canvas_status
    profile.ed_token_status = ed_status
    profile.last_sync_at = last_sync_at
    profile.recall_email_sent_at = recall_email_sent_at
    profile.display_name = display_name
    return profile


# ----------------------------------------------------------------------
# should_send_recall_email — pure gating function (Tests 1-6)
# ----------------------------------------------------------------------


def test_1_returns_false_when_both_tokens_ok() -> None:
    """Test 1: both tokens 'ok' -> False regardless of other fields."""
    absent = NOW - timedelta(days=30)
    profile = _make_profile(
        canvas_status="active",
        ed_status="active",
        last_sync_at=absent,
        recall_email_sent_at=None,
    )
    assert should_send_recall_email(profile, absent, NOW) is False


def test_2_returns_false_when_sign_in_recent() -> None:
    """Test 2: last_sign_in_at < 14d ago -> False (user still active)."""
    absent_sync = NOW - timedelta(days=30)
    recent_sign_in = NOW - timedelta(days=5)
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=absent_sync,
        recall_email_sent_at=None,
    )
    assert should_send_recall_email(profile, recent_sign_in, NOW) is False


def test_3_returns_false_when_sync_recent() -> None:
    """Test 3: last_sync_at < 14d ago -> False."""
    absent_sign_in = NOW - timedelta(days=30)
    recent_sync = NOW - timedelta(days=5)
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=recent_sync,
        recall_email_sent_at=None,
    )
    assert should_send_recall_email(profile, absent_sign_in, NOW) is False


def test_4_returns_false_when_recall_within_30d() -> None:
    """Test 4: recall_email_sent_at < 30d ago -> False (rate-limited)."""
    absent = NOW - timedelta(days=30)
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=absent,
        recall_email_sent_at=NOW - timedelta(days=10),
    )
    assert should_send_recall_email(profile, absent, NOW) is False


def test_5_returns_true_when_all_gates_open() -> None:
    """Test 5: token expired + 14d absent + no prior recall -> True."""
    absent = NOW - timedelta(days=20)
    profile = _make_profile(
        canvas_status="expired",
        ed_status="active",
        last_sync_at=absent,
        recall_email_sent_at=None,
    )
    assert should_send_recall_email(profile, absent, NOW) is True


def test_6_returns_true_when_recall_older_than_30d() -> None:
    """Test 6: recall_email_sent_at > 30d ago -> re-arm True."""
    absent = NOW - timedelta(days=20)
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=absent,
        recall_email_sent_at=NOW - timedelta(days=31),
    )
    assert should_send_recall_email(profile, absent, NOW) is True


# ----------------------------------------------------------------------
# RecallEmailService.send_recall — full IO path (Tests 7-12)
# ----------------------------------------------------------------------


def _build_service(
    *,
    send_return: bool = True,
    email: str | None = "alice@uni.sydney.edu.au",
    deadline_count: int = 0,
) -> tuple[RecallEmailService, AsyncMock, AsyncMock, list[object]]:
    """Construct a RecallEmailService with mocked session + sender + deadlines.

    Returns (service, mock_session, mock_sender, captured_executes) where
    captured_executes accumulates every SQL statement/dict passed to
    session.execute for inspection (auth.users SELECT vs profile UPDATE).
    """
    captured: list[object] = []

    auth_row = SimpleNamespace(email=email) if email is not None else None
    auth_result = MagicMock()
    auth_result.first.return_value = auth_row

    update_result = MagicMock()  # sqlalchemy returns a Result from update

    async def _execute(stmt: object, params: dict[str, object] | None = None) -> object:
        captured.append((stmt, params))
        # First call is the auth.users SELECT; subsequent calls are the UPDATE.
        if len(captured) == 1:
            return auth_result
        return update_result

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=_execute)

    mock_sender = AsyncMock()
    mock_sender.send_html_email = AsyncMock(return_value=send_return)

    service = RecallEmailService(
        session=mock_session,
        sender=mock_sender,
        app_base_url="https://uniboard.uk",
    )

    # Patch DeadlineService.list_upcoming at class-attribute level so the
    # service's internal instantiation uses the mocked coroutine.
    dummy_deadlines = [MagicMock() for _ in range(deadline_count)]
    patcher = patch(
        "src.services.recall_email.DeadlineService.list_upcoming",
        new=AsyncMock(return_value=dummy_deadlines),
    )
    patcher.start()
    # Stash the patcher on the service so tests can stop it in teardown if
    # needed. We rely on pytest's per-test isolation + patch.stopall().
    service._patcher = patcher  # type: ignore[attr-defined]

    return service, mock_session, mock_sender, captured


@pytest.fixture(autouse=True)
def _stop_patches() -> None:
    yield  # type: ignore[misc]
    patch.stopall()


@pytest.mark.asyncio
async def test_7_subject_contains_deadline_count_when_gt_zero() -> None:
    """Test 7: deadline_count > 0 -> subject 'N deadlines waiting'."""
    service, _, sender, _ = _build_service(deadline_count=4)
    profile = _make_profile(display_name="Alice")

    ok = await service.send_recall(uuid.uuid4(), profile, now=NOW)
    assert ok is True

    kwargs = sender.send_html_email.call_args.kwargs
    assert "4 deadlines waiting" in kwargs["subject"]


@pytest.mark.asyncio
async def test_8_subject_fallback_when_zero_deadlines() -> None:
    """Test 8: deadline_count == 0 -> subject 'reconnect when you're back'."""
    service, _, sender, _ = _build_service(deadline_count=0)
    profile = _make_profile(display_name="Alice")

    ok = await service.send_recall(uuid.uuid4(), profile, now=NOW)
    assert ok is True

    kwargs = sender.send_html_email.call_args.kwargs
    assert "reconnect when you're back" in kwargs["subject"]
    assert "deadlines waiting" not in kwargs["subject"]


@pytest.mark.asyncio
async def test_9_successful_send_updates_profile_timestamp() -> None:
    """Test 9: on send success, issue UPDATE setting recall_email_sent_at=now."""
    service, _, _, captured = _build_service(send_return=True)
    profile = _make_profile()
    user_id = uuid.uuid4()

    ok = await service.send_recall(user_id, profile, now=NOW)
    assert ok is True

    # Two execute calls: auth.users SELECT, then profiles UPDATE.
    assert len(captured) == 2
    update_stmt, _ = captured[1]
    # Cheapest assertion that avoids hand-compiling the UPDATE: stringify.
    sql = str(update_stmt.compile(compile_kwargs={"literal_binds": False}))
    assert "UPDATE profiles" in sql
    assert "recall_email_sent_at" in sql


@pytest.mark.asyncio
async def test_10_failed_send_skips_update_and_returns_false() -> None:
    """Test 10: SES returns False -> no UPDATE, method returns False."""
    service, _, _, captured = _build_service(send_return=False)
    profile = _make_profile()

    ok = await service.send_recall(uuid.uuid4(), profile, now=NOW)
    assert ok is False

    # Only the auth.users SELECT was issued; no UPDATE.
    assert len(captured) == 1


@pytest.mark.asyncio
async def test_11_html_body_contains_deep_link() -> None:
    """Test 11: rendered HTML body includes '/setup?step=token'."""
    service, _, sender, _ = _build_service(deadline_count=2)
    profile = _make_profile()

    await service.send_recall(uuid.uuid4(), profile, now=NOW)
    kwargs = sender.send_html_email.call_args.kwargs
    assert "/setup?step=token" in kwargs["html_body"]
    assert "Reconnect UniBoard" in kwargs["html_body"]


@pytest.mark.asyncio
async def test_12_text_body_contains_deep_link() -> None:
    """Test 12: rendered plaintext body includes '/setup?step=token'."""
    service, _, sender, _ = _build_service(deadline_count=0)
    profile = _make_profile()

    await service.send_recall(uuid.uuid4(), profile, now=NOW)
    kwargs = sender.send_html_email.call_args.kwargs
    text_body = kwargs["text_body"]
    assert text_body is not None
    assert "/setup?step=token" in text_body
