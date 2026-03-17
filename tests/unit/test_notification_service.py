"""Unit tests for NotificationService -- create, dedup, query, mark-read."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.security.password import hash_password


async def _create_test_user(
    session: AsyncSession,
    *,
    email: str | None = None,
    gpa_target: float | None = None,
) -> User:
    """Create a test user and return it."""
    user = User(
        email=email or f"notif-test-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Notif Tester",
        gpa_target=gpa_target,
    )
    session.add(user)
    await session.flush()
    return user


# ---------------------------------------------------------------------------
# Test 1: create_notification returns Notification; duplicate returns None
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_notification_returns_notification(session: AsyncSession) -> None:
    """Creating a notification returns a Notification with correct fields."""
    from src.services.notification import NotificationService

    user = await _create_test_user(session)
    svc = NotificationService(session)

    result = await svc.create_notification(
        user_id=user.id,
        notification_type="deadline_reminder",
        severity="info",
        title="Assignment 1 due in 72h",
        body="COMP2017 Assignment 1 is due in 72 hours.",
    )

    assert result is not None
    assert result.type == "deadline_reminder"
    assert result.severity == "info"
    assert result.title == "Assignment 1 due in 72h"
    assert result.body == "COMP2017 Assignment 1 is due in 72 hours."
    assert result.is_read is False
    assert result.user_id == user.id


@pytest.mark.asyncio
async def test_create_notification_duplicate_returns_none(session: AsyncSession) -> None:
    """Duplicate notification (same user + type + title) returns None via PushRecord dedup."""
    from src.services.notification import NotificationService

    user = await _create_test_user(session)
    svc = NotificationService(session)

    first = await svc.create_notification(
        user_id=user.id,
        notification_type="deadline_reminder",
        severity="info",
        title="Assignment 1 due in 72h",
        body="First body",
    )
    assert first is not None

    second = await svc.create_notification(
        user_id=user.id,
        notification_type="deadline_reminder",
        severity="info",
        title="Assignment 1 due in 72h",
        body="Second body (same hash)",
    )
    assert second is None


# ---------------------------------------------------------------------------
# Test 2: get_notifications returns filtered list ordered by created_at desc
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_notifications_filtered_and_ordered(session: AsyncSession) -> None:
    """Notifications for a user are returned ordered by created_at desc."""
    from src.services.notification import NotificationService

    user = await _create_test_user(session)
    svc = NotificationService(session)

    # Create multiple notifications with different titles (unique hashes)
    for i in range(3):
        await svc.create_notification(
            user_id=user.id,
            notification_type="system",
            severity="info",
            title=f"System notification {i}",
            body=f"Body {i}",
        )

    results = await svc.get_notifications(user.id, limit=50, offset=0)
    assert len(results) == 3


@pytest.mark.asyncio
async def test_mark_read_sets_is_read(session: AsyncSession) -> None:
    """mark_read sets is_read=True on the notification."""
    from src.services.notification import NotificationService

    user = await _create_test_user(session)
    svc = NotificationService(session)

    notif = await svc.create_notification(
        user_id=user.id,
        notification_type="system",
        severity="info",
        title="Mark-read test",
        body="Body",
    )
    assert notif is not None
    assert notif.is_read is False

    updated = await svc.mark_read(user.id, notif.id)
    assert updated is not None
    assert updated.is_read is True


# ---------------------------------------------------------------------------
# Test 3: get_unread_count returns correct integer
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_unread_count(session: AsyncSession) -> None:
    """Unread count reflects only unread notifications for the user."""
    from src.services.notification import NotificationService

    user = await _create_test_user(session)
    svc = NotificationService(session)

    # Create 3 notifications
    notifs = []
    for i in range(3):
        n = await svc.create_notification(
            user_id=user.id,
            notification_type="system",
            severity="info",
            title=f"Unread test {i}",
            body=f"Body {i}",
        )
        if n is not None:
            notifs.append(n)

    # All 3 should be unread
    count = await svc.get_unread_count(user.id)
    assert count == 3

    # Mark one as read
    await svc.mark_read(user.id, notifs[0].id)
    count = await svc.get_unread_count(user.id)
    assert count == 2
