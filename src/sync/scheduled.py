"""Scheduled sync tasks — deadline reminders, daily digests, token health."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import or_, select

from src.models.course import Course
from src.models.user import Profile
from src.sync._shared import _get_sync_session_factory

logger = structlog.get_logger()


async def check_deadline_reminders() -> None:
    """Check for upcoming deadlines and create reminder notifications.

    Runs on interval (default 30 min). Creates notifications for deadlines
    in 72h/24h/3h windows. PushRecord dedup prevents duplicate alerts.
    """
    from src.models.deadline import UnifiedDeadline
    from src.services.notification import NotificationService

    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(select(Profile))
        users = list(result.scalars().all())

    if not users:
        return

    now = datetime.now(UTC)

    # Reminder tiers: (hours_before, tier_name, severity)
    tiers: list[tuple[float, float, str, str]] = [
        (2.5, 3.5, "3h", "critical"),
        (23.0, 25.0, "24h", "warning"),
        (71.0, 73.0, "72h", "info"),
    ]

    for user in users:
        async with session_factory() as session:
            # Get all user's courses
            courses_result = await session.execute(
                select(Course).where(Course.user_id == user.id)
            )
            courses = list(courses_result.scalars().all())
            course_map = {c.id: c for c in courses}
            course_ids = list(course_map.keys())

            if not course_ids:
                continue

            for low_h, high_h, tier_name, severity in tiers:
                window_start = now + timedelta(hours=low_h)
                window_end = now + timedelta(hours=high_h)

                deadlines_result = await session.execute(
                    select(UnifiedDeadline).where(
                        UnifiedDeadline.course_id.in_(course_ids),
                        UnifiedDeadline.due_date >= window_start,
                        UnifiedDeadline.due_date <= window_end,
                    )
                )
                deadlines = list(deadlines_result.scalars().all())

                notif_svc = NotificationService(session)
                for deadline in deadlines:
                    course = course_map.get(deadline.course_id)
                    course_code = course.code if course else "Unknown"
                    await notif_svc.create_notification(
                        user_id=user.id,
                        notification_type="deadline_reminder",
                        severity=severity,
                        title=f"{course_code}: {deadline.title} due in {tier_name}",
                        body=f"{deadline.title} is due in {tier_name}.",
                        channels=["in_app", "email"],
                    )

            await session.commit()


async def generate_daily_digests() -> None:
    """Generate daily digests for all users.

    Runs via CronTrigger at 07:00 AEST (Australia/Sydney timezone).
    """
    from src.config import get_settings
    from src.services.digest import DigestService

    session_factory = _get_sync_session_factory()
    settings = get_settings()

    async with session_factory() as session:
        result = await session.execute(select(Profile))
        users = list(result.scalars().all())

    if not users:
        logger.info("digest_skip", reason="no users")
        return

    for user in users:
        try:
            async with session_factory() as session:
                svc = DigestService(
                    session,
                    anthropic_api_key=settings.anthropic_api_key,
                    language="en",
                )
                await svc.generate_digest(user.id)
                await session.commit()
                logger.info("digest_generated", user_id=str(user.id))
        except Exception:
            logger.error(
                "digest_generation_failed",
                user_id=str(user.id),
                exc_info=True,
            )


async def check_token_health() -> None:
    """Check for expired tokens and create warning notifications (PLAT-04).

    Runs alongside deadline reminders. Queries profiles with
    canvas_token_status='expired' or ed_token_status='expired' and creates
    in-app notifications guiding users to Settings page for re-auth.
    """
    from src.services.notification import NotificationService

    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(
                or_(
                    Profile.canvas_token_status == "expired",
                    Profile.ed_token_status == "expired",
                )
            )
        )
        expired_users = list(result.scalars().all())

    if not expired_users:
        return

    _TOKEN_PLATFORMS = (
        ("canvas", "Canvas API token expired", "Your Canvas token has expired."),
        ("ed", "Ed API token expired", "Your Ed token has expired."),
    )

    for user in expired_users:
        try:
            async with session_factory() as session:
                notif_svc = NotificationService(session)
                for platform, title, body_prefix in _TOKEN_PLATFORMS:
                    if getattr(user, f"{platform}_token_status") == "expired":
                        await notif_svc.create_notification(
                            user_id=user.id,
                            notification_type="token_expiry",
                            severity="warning",
                            title=title,
                            body=f"{body_prefix} Go to Settings to reconnect.",
                            channels=["in_app"],
                            action_url="/settings#tokens",
                        )
                await session.commit()
        except Exception:
            logger.warning(
                "token_health_check_failed",
                user_id=str(user.id),
                exc_info=True,
            )
