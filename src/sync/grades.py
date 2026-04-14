"""Grade sync tasks — sync Canvas grades for all users."""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.course import Course
from src.models.grade import Grade
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


async def _sync_user_grades(
    user: Profile,
    canvas_token: str,
    session: AsyncSession,
) -> int:
    """Sync grades for a single user from Canvas. Returns count of records upserted."""
    from src.adapters.canvas import CanvasAdapter

    adapter = CanvasAdapter(canvas_token)
    count = 0
    try:
        courses = await adapter.get_courses()

        # Get user's linked courses
        stmt = select(Course).where(Course.user_id == user.id)
        result = await session.execute(stmt)
        user_courses = {c.canvas_course_id: c for c in result.scalars().all() if c.canvas_course_id}

        for canvas_course in courses:
            course_id = str(canvas_course.get("id", ""))
            if course_id not in user_courses:
                continue

            local_course = user_courses[course_id]
            # SYNC-FIX-02: include submission to get per-user score + grade letter
            assignments = await adapter.get_assignments(course_id, include=["submission"])

            for assignment in assignments:
                name = str(assignment.get("name", ""))
                if not name:
                    continue

                # Extract submission/grade info
                submission = assignment.get("submission")
                score = None
                graded_at_val = None
                if isinstance(submission, dict):
                    raw_score = submission.get("score")
                    if raw_score is not None:
                        score = float(str(raw_score))
                    graded_str = submission.get("graded_at")
                    if isinstance(graded_str, str) and graded_str:
                        with contextlib.suppress(ValueError):
                            graded_at_val = datetime.fromisoformat(
                                graded_str.replace("Z", "+00:00")
                            )

                max_score = float(str(assignment.get("points_possible", 100)))
                weight_raw = assignment.get("group_weight", 0)
                weight = float(str(weight_raw)) if weight_raw else 0.0

                values = {
                    "id": uuid.uuid4(),
                    "course_id": local_course.id,
                    "assessment_name": name,
                    "score": score,
                    "max_score": max_score,
                    "weight": weight,
                    "group_name": str(assignment.get("assignment_group_id", "")),
                    "graded_at": graded_at_val,
                }

                insert_stmt = pg_insert(Grade).values(**values)
                insert_stmt = insert_stmt.on_conflict_do_update(
                    constraint="uq_grades_course_assessment",
                    set_={
                        "score": values["score"],
                        "max_score": values["max_score"],
                        "weight": values["weight"],
                        "graded_at": values["graded_at"],
                    },
                )
                await session.execute(insert_stmt)
                count += 1

        user.canvas_sync_status = "success"
        user.canvas_last_synced_at = datetime.now(UTC)
        user.canvas_token_status = "active"
        await session.commit()

    except TokenInvalidError:
        user.canvas_token_status = "expired"
        user.canvas_sync_status = "degraded"
        await session.commit()
        logger.warning("sync_token_expired", user_id=str(user.id), platform="canvas")
    finally:
        await adapter.close()
    return count


async def sync_all_grades() -> None:
    """Sync grades for all users with Canvas tokens."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(Profile.canvas_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_grades_skip", reason="no users with canvas tokens")
        return

    encryption = get_encryption()
    settings = get_settings()

    # Lazy import to avoid circular dependency at module level
    from src.services.risk_alert import RiskAlertService

    for user in users:
        started_at = datetime.now(UTC)
        sync_status = "success"
        sync_error: str | None = None
        records_updated = 0
        for attempt in range(_MAX_RETRIES):
            try:
                token = encryption.decrypt(str(user.canvas_api_token_encrypted))
                async with session_factory() as session:
                    # Re-attach user to this session
                    user_in_session = await session.get(Profile, user.id)
                    if user_in_session is None:
                        break
                    records_updated = await _sync_user_grades(
                        user_in_session, token, session
                    )
                break  # Success
            except TokenInvalidError:
                sync_status = "failed"
                sync_error = "Token expired"
                break  # Don't retry on auth errors
            except Exception as exc:
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(
                        "sync_grades_retry",
                        user_id=str(user.id),
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(2**attempt)
                else:
                    sync_status = "failed"
                    sync_error = str(exc)[:500]
                    logger.error(
                        "sync_grades_failed",
                        user_id=str(user.id),
                    )
                    async with session_factory() as session:
                        user_in_session = await session.get(Profile, user.id)
                        if user_in_session is not None:
                            user_in_session.canvas_sync_status = "failed"
                            await session.commit()
        # Post-grade-sync risk alert (DL-03)
        # Guard: _sync_user_grades swallows TokenInvalidError internally
        # (sets canvas_sync_status="degraded") and returns count=0,
        # so sync_status=="success" alone is insufficient.
        if sync_status == "success" and records_updated > 0:
            try:
                async with session_factory() as risk_session:
                    risk_svc = RiskAlertService(
                        risk_session,
                        anthropic_api_key=settings.anthropic_api_key,
                    )
                    await risk_svc.check_risk_for_user(user.id)
                    await risk_session.commit()
            except Exception:
                logger.warning(
                    "risk_alert_post_sync_failed",
                    user_id=str(user.id),
                    exc_info=True,
                )

        await _record_sync_history(
            session_factory,
            user.id,
            "grades",
            sync_status,
            records_updated=records_updated,
            error_message=sync_error,
            started_at=started_at,
        )
