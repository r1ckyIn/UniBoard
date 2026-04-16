"""Scheduled sync tasks — deadline reminders, daily digests, token health."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import sentry_sdk
import structlog
from sqlalchemy import or_, select, text

from src.models.course import Course
from src.models.user import Profile
from src.services.recall_email import RecallEmailService, should_send_recall_email
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


async def check_token_health(now: datetime | None = None) -> None:
    """Check for expired tokens and dispatch warnings + recall emails.

    PLAT-04: create in-app token-expiry notifications guiding users to
    Settings for re-auth.

    EMAIL-03 (Phase 33): additionally dispatch a recall (re-engagement)
    email for users who have an expired token AND have been absent from
    both the app (no sign-in >=14d) and the sync pipeline (no sync >=14d)
    AND have not received a recall email in the last 30 days.

    The optional ``now`` parameter exists for deterministic testing (no
    freezegun in this project).
    """
    from src.services.notification import NotificationService

    reference = now or datetime.now(UTC)
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
            continue

        # Recall email evaluation (EMAIL-03) -- isolated so a failure here
        # never propagates into the per-user loop above.
        try:
            async with session_factory() as session:
                row_result = await session.execute(
                    text(
                        "SELECT last_sign_in_at FROM auth.users WHERE id = :uid"
                    ),
                    {"uid": str(user.id)},
                )
                row = row_result.first()
                last_sign_in_at = row.last_sign_in_at if row else None

                if should_send_recall_email(user, last_sign_in_at, reference):
                    recall_svc = RecallEmailService(session)
                    await recall_svc.send_recall(user.id, user, now=reference)
                    await session.commit()
        except Exception:
            # Scope tag locally so it does not leak to subsequent scheduler events.
            with sentry_sdk.new_scope() as scope:
                scope.set_tag("phase", "33")
                sentry_sdk.capture_exception()
            logger.warning(
                "recall_email_branch_failed",
                user_id=str(user.id),
                exc_info=True,
            )
