"""Risk alert service detecting GPA trajectory deviation with AI deep analysis."""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import Notification
from src.models.user import Profile
from src.schemas.digest import RiskAlertResponse
from src.services.ai_engine import AIEngine
from src.services.gpa import GPAService
from src.services.notification import NotificationService

logger = structlog.get_logger()


class RiskAlertService:
    """Detect GPA risk and invoke Claude Opus 4.6 for deep analysis."""

    def __init__(
        self,
        session: AsyncSession,
        anthropic_api_key: str = "",
    ) -> None:
        self._session = session
        self._anthropic_api_key = anthropic_api_key

    async def check_risk_for_user(
        self,
        user_id: uuid.UUID,
    ) -> RiskAlertResponse | None:
        """Check if user's WAM deviates from gpa_target by 5+ points.

        When risk detected, invokes Claude Opus 4.6 for deep analysis.
        Falls back to rule-based recommendation on AI failure.
        """
        profile = await self._session.get(Profile, user_id)
        if profile is None or profile.gpa_target is None:
            return None

        gpa_svc = GPAService(self._session)
        summary = await gpa_svc.get_summary(user_id)

        target_wam = profile.gpa_target
        current_wam = summary.cumulative_wam
        gap = target_wam - current_wam

        if gap < 5.0:
            return None

        # Determine severity
        severity = "critical" if gap >= 10.0 else "warning"

        # Build course breakdown for AI prompt
        course_breakdown = "\n".join(
            f"- {c.course_code} ({c.course_name}): WAM={c.wam:.1f}, "
            f"assessed={c.pct_assessed:.0f}%, {c.graded_count}/{c.assessment_count} graded"
            for c in summary.courses
        )

        # Attempt AI deep analysis
        recommendation = ""
        ai_was_called = False

        if self._anthropic_api_key:
            try:
                ai_engine = AIEngine(api_key=self._anthropic_api_key)
                recommendation = await ai_engine.analyze_gpa_risk(
                    current_wam=current_wam,
                    target_wam=target_wam,
                    course_grades_json=course_breakdown,
                )
                ai_was_called = True
            except Exception:
                logger.warning(
                    "risk_alert_ai_failed",
                    user_id=str(user_id),
                    exc_info=True,
                )

        # Fallback rule-based recommendation
        if not recommendation:
            recommendation = (
                f"Your current WAM ({current_wam:.1f}) is {gap:.1f} points below "
                f"your target ({target_wam:.1f}). Focus on upcoming assessments "
                f"in courses with the largest grade gaps."
            )

        # Increment AI calls counter if AI was actually called
        if ai_was_called:
            profile.ai_calls_today += 1
            await self._session.flush()

        # Create notification via NotificationService
        notif_svc = NotificationService(self._session)
        notification = await notif_svc.create_notification(
            user_id=user_id,
            notification_type="gpa_risk",
            severity=severity,
            title=f"GPA Risk Alert: WAM {gap:.1f} points below target",
            body=recommendation,
            channels=["in_app", "email"],
        )

        # Build response
        # Use first course as representative (or empty if no courses)
        first_course = summary.courses[0] if summary.courses else None
        return RiskAlertResponse(
            id=str(notification.id) if notification else str(uuid.uuid4()),
            course_code=first_course.course_code if first_course else "ALL",
            course_name=first_course.course_name if first_course else "All Courses",
            current_wam=current_wam,
            target_wam=target_wam,
            gap=gap,
            severity=severity,
            recommendation=recommendation,
            created_at=notification.created_at.isoformat() if notification else "",
        )

    async def get_alerts(
        self,
        user_id: uuid.UUID,
    ) -> list[Notification]:
        """Query recent GPA risk alert notifications for a user."""
        stmt = (
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.type == "gpa_risk",
            )
            .order_by(Notification.created_at.desc())
            .limit(10)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
