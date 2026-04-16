"""Recall (re-engagement) email service — EMAIL-03.

Dispatches a branded HTML + plaintext email to users who have an expired
Canvas/Ed token AND have been absent from both the app and sync pipeline
for at least 14 days. A 30-day rate limit guards against repeated sends.

Gating is a pure function (``should_send_recall_email``) so it can be
unit-tested without DB or SES. The sending path is a class that composes
the existing ``SESEmailSender`` with ``DeadlineService`` for subject-line
deadline counts, then stamps ``profiles.recall_email_sent_at`` on success.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

import sentry_sdk
import structlog
from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.email.ses import SESEmailSender
from src.models.user import Profile
from src.observability import sentry_phase_scope
from src.services.deadline import DeadlineService

logger = structlog.get_logger()

ABSENCE_THRESHOLD_DAYS = 14
RECALL_RATE_LIMIT_DAYS = 30
_TEMPLATES_DIR = Path(__file__).parent.parent / "email" / "templates"


def should_send_recall_email(
    profile: Profile,
    last_sign_in_at: datetime | None,
    now: datetime,
) -> bool:
    """Pure gating function — returns True iff a recall email should be sent.

    All four conditions must hold:
      1. At least one platform token is ``expired``.
      2. The user has not signed in for >= 14 days.
      3. The user's last sync is >= 14 days old.
      4. No recall email has been sent in the last 30 days.
    """
    any_expired = (
        profile.canvas_token_status == "expired"
        or profile.ed_token_status == "expired"
    )
    if not any_expired:
        return False

    absence_cutoff = now - timedelta(days=ABSENCE_THRESHOLD_DAYS)
    sign_in_absent = last_sign_in_at is None or last_sign_in_at < absence_cutoff
    sync_absent = profile.last_sync_at is None or profile.last_sync_at < absence_cutoff
    if not (sign_in_absent and sync_absent):
        return False

    rate_cutoff = now - timedelta(days=RECALL_RATE_LIMIT_DAYS)
    recently_sent = (
        profile.recall_email_sent_at is not None
        and profile.recall_email_sent_at >= rate_cutoff
    )
    return not recently_sent


class RecallEmailService:
    """Compose SESEmailSender + DeadlineService into a recall-email dispatcher."""

    def __init__(
        self,
        session: AsyncSession,
        sender: SESEmailSender | None = None,
        app_base_url: str | None = None,
    ) -> None:
        self._session = session
        self._sender = sender or SESEmailSender()
        self._base_url = app_base_url or os.getenv(
            "APP_BASE_URL", "https://uniboard.uk"
        )
        self._html_template = (_TEMPLATES_DIR / "recall.html").read_text(
            encoding="utf-8"
        )
        self._text_template = (_TEMPLATES_DIR / "recall.txt").read_text(
            encoding="utf-8"
        )

    async def send_recall(
        self,
        user_id: UUID,
        profile: Profile,
        *,
        now: datetime | None = None,
    ) -> bool:
        """Send a recall email for ``user_id``. Returns True when delivered.

        On successful SES dispatch, updates ``profiles.recall_email_sent_at``
        to ``now`` (or ``datetime.now(UTC)`` when omitted). On failure,
        reports to Sentry with ``phase=33`` tag and returns False without
        updating the profile.
        """
        reference = now or datetime.now(UTC)

        row_result = await self._session.execute(
            text("SELECT email FROM auth.users WHERE id = :uid"),
            {"uid": str(user_id)},
        )
        row = row_result.first()
        if row is None or not getattr(row, "email", None):
            logger.warning("recall_email_no_auth_user", user_id=str(user_id))
            return False
        to_email: str = row.email

        svc = DeadlineService(self._session)
        upcoming = await svc.list_upcoming(
            user_id, horizon_days=14, now=reference
        )
        deadline_count = len(upcoming)

        subject = (
            f"Your UniBoard sync has paused — {deadline_count} deadlines waiting"
            if deadline_count > 0
            else "Your UniBoard sync has paused — reconnect when you're back"
        )
        deep_link = f"{self._base_url}/setup?step=token"
        display_name = (profile.display_name or "there").strip() or "there"
        deadline_line = (
            f"You have {deadline_count} deadlines coming up in the next 14 days."
            if deadline_count > 0
            else ""
        )

        ctx: dict[str, object] = {
            "display_name": display_name,
            "deadline_count": deadline_count,
            "deadline_line": deadline_line,
            "deep_link": deep_link,
        }
        html = self._html_template.format(**ctx)
        text_body = self._text_template.format(**ctx)

        sent = await self._sender.send_html_email(
            to_email=to_email,
            subject=subject,
            html_body=html,
            sender="noreply@uniboard.uk",
            text_body=text_body,
        )
        if not sent:
            with sentry_phase_scope("33"):
                sentry_sdk.capture_message(
                    "recall_email_send_failed", level="warning"
                )
            logger.warning("recall_email_send_failed", user_id=str(user_id))
            return False

        await self._session.execute(
            update(Profile)
            .where(Profile.id == user_id)
            .values(recall_email_sent_at=reference)
        )
        logger.info(
            "recall_email_sent",
            user_id=str(user_id),
            deadline_count=deadline_count,
        )
        return True
