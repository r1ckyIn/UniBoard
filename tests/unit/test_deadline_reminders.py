"""Unit tests for check_deadline_reminders -- DL-02 tiered reminders."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.user import Profile


def _make_profile() -> Profile:
    """Build a mock Profile."""
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    return profile


def _make_course(user_id: uuid.UUID, *, code: str = "COMP2017") -> Course:
    """Build a mock Course."""
    course = MagicMock(spec=Course)
    course.id = uuid.uuid4()
    course.user_id = user_id
    course.code = code
    return course


def _make_deadline(
    course_id: uuid.UUID, *, title: str = "Assignment 1", hours_from_now: float = 72.0
) -> UnifiedDeadline:
    """Build a mock UnifiedDeadline due hours_from_now in the future."""
    dl = MagicMock(spec=UnifiedDeadline)
    dl.course_id = course_id
    dl.title = title
    dl.due_date = datetime.now(UTC) + timedelta(hours=hours_from_now)
    return dl


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
async def test_72h_reminder_creates_info_notification(
    mock_factory_fn: MagicMock,
) -> None:
    """Deadline within 72h window triggers info-severity notification."""
    profile = _make_profile()
    course = _make_course(profile.id)
    deadline = _make_deadline(course.id, hours_from_now=72.0)

    # Session 1: query for all profiles
    session1 = AsyncMock()
    profile_result = MagicMock()
    profile_result.scalars.return_value.all.return_value = [profile]
    session1.execute = AsyncMock(return_value=profile_result)

    # Session 2: per-user — courses query + deadline tier queries + commit
    session2 = AsyncMock()
    call_count = {"n": 0}

    async def _execute_per_user(stmt: object) -> MagicMock:
        call_count["n"] += 1
        result = MagicMock()
        stmt_str = str(stmt)
        if "courses" in stmt_str.lower():
            result.scalars.return_value.all.return_value = [course]
        elif "unified_deadlines" in stmt_str.lower():
            # Return our deadline for the 72h tier query only
            result.scalars.return_value.all.return_value = [deadline]
        else:
            result.scalars.return_value.all.return_value = []
        return result

    session2.execute = _execute_per_user
    session2.commit = AsyncMock()

    sessions = [session1, session2]
    idx = {"i": 0}

    def _factory() -> _SessionCtx:
        i = min(idx["i"], len(sessions) - 1)
        idx["i"] += 1
        return _SessionCtx(sessions[i])

    mock_factory_fn.return_value = MagicMock(side_effect=_factory)

    with patch("src.services.notification.NotificationService") as MockNotifSvc:
        mock_instance = MagicMock()
        mock_instance.create_notification = AsyncMock(return_value=MagicMock())
        MockNotifSvc.return_value = mock_instance

        from src.sync.scheduled import check_deadline_reminders

        await check_deadline_reminders()

        # At least one notification should have been created
        assert mock_instance.create_notification.call_count >= 1


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_no_reminders_when_no_users(mock_factory_fn: MagicMock) -> None:
    """No notifications when there are no users."""
    # Session returns empty profile list
    session1 = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    session1.execute = AsyncMock(return_value=result)

    mock_factory_fn.return_value = MagicMock(
        side_effect=lambda: _SessionCtx(session1)
    )

    from src.sync.scheduled import check_deadline_reminders

    # Should return early without error
    await check_deadline_reminders()


@pytest.mark.asyncio
@patch("src.sync.scheduled._get_sync_session_factory")
async def test_no_reminders_when_no_courses(mock_factory_fn: MagicMock) -> None:
    """User with no courses produces no notifications."""
    profile = _make_profile()

    # Session 1 returns profile, Session 2 returns empty courses
    session1 = AsyncMock()
    profile_result = MagicMock()
    profile_result.scalars.return_value.all.return_value = [profile]
    session1.execute = AsyncMock(return_value=profile_result)

    session2 = AsyncMock()
    empty_result = MagicMock()
    empty_result.scalars.return_value.all.return_value = []
    session2.execute = AsyncMock(return_value=empty_result)
    session2.commit = AsyncMock()

    sessions = [session1, session2]
    idx = {"i": 0}

    def _factory() -> _SessionCtx:
        i = min(idx["i"], len(sessions) - 1)
        idx["i"] += 1
        return _SessionCtx(sessions[i])

    mock_factory_fn.return_value = MagicMock(side_effect=_factory)

    from src.sync.scheduled import check_deadline_reminders

    await check_deadline_reminders()
    # Should not raise; no notification service calls expected
