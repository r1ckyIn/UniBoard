"""Notification service with PushRecord SHA-256 dedup and dual-channel delivery."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import Notification
from src.models.push_record import PushRecord

logger = structlog.get_logger()


class NotificationService:
    """Create, query, and manage user notifications with dedup."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_notification(
        self,
        user_id: uuid.UUID,
        notification_type: str,
        severity: str,
        title: str,
        body: str,
        channels: list[str] | None = None,
        action_url: str | None = None,
        metadata_json: dict[str, object] | None = None,
    ) -> Notification | None:
        """Create notification with SHA-256 content_hash dedup via PushRecord.

        Returns the Notification if created, or None if a duplicate was found.
        """
        if channels is None:
            channels = ["in_app"]

        # Compute SHA-256 content_hash from user_id + type + title
        content_hash = hashlib.sha256(
            f"{user_id}|{notification_type}|{title}".encode()
        ).hexdigest()

        # Check PushRecord for existing hash (dedup)
        existing = await self._session.execute(
            select(PushRecord).where(
                PushRecord.user_id == user_id,
                PushRecord.content_hash == content_hash,
            )
        )
        if existing.scalar_one_or_none() is not None:
            return None

        # Create Notification
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            severity=severity,
            title=title,
            body=body,
            action_url=action_url,
            metadata_json=metadata_json,
        )
        self._session.add(notification)

        # Create PushRecord atomically
        push_record = PushRecord(
            user_id=user_id,
            content_hash=content_hash,
            source_type=notification_type,
            source_id=str(notification.id),
            pushed_at=datetime.utcnow(),  # noqa: DTZ003
            channel=channels[0],
        )
        self._session.add(push_record)
        await self._session.flush()

        # Email delivery (fire-and-forget, never raise)
        # Email is stored in auth.users (Supabase), not in profiles table
        if "email" in channels:
            try:
                from sqlalchemy import text

                row = await self._session.execute(
                    text("SELECT email FROM auth.users WHERE id = :uid"),
                    {"uid": user_id},
                )
                auth_user = row.first()
                if auth_user is not None and auth_user.email:
                    from src.email.ses import SESEmailSender

                    sender = SESEmailSender()
                    await sender.send_html_email(
                        to_email=auth_user.email,
                        subject=title,
                        html_body=body,
                    )
            except Exception:
                logger.warning(
                    "notification_email_failed",
                    user_id=str(user_id),
                    title=title,
                )

        return notification

    async def get_notifications(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        """Get notifications for a user, ordered by created_at desc."""
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def mark_read(
        self,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> Notification | None:
        """Mark a notification as read."""
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        notification = result.scalar_one_or_none()
        if notification is None:
            return None
        notification.is_read = True
        await self._session.flush()
        return notification

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """Return count of unread notifications for a user."""
        stmt = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        result = await self._session.execute(stmt)
        count = result.scalar_one()
        return int(count)
