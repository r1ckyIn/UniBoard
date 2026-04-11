"""Course discovery sync — creates Course records from Canvas + Ed APIs."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.course import Course
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.services.course_linking import LinkedCourse, link_courses
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


async def _upsert_courses(
    session: AsyncSession,
    user_id: uuid.UUID,
    linked: list[LinkedCourse],
) -> int:
    """Upsert Course records from linked course data. Returns count of records."""
    count = 0
    for lc in linked:
        if not lc.course_code:
            continue

        # Use (user_id, code, semester) as natural key via ix_courses_user_semester
        stmt = select(Course).where(
            Course.user_id == user_id,
            Course.code == lc.course_code,
            Course.semester == (lc.semester or ""),
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Update platform IDs if newly discovered
            changed = False
            if lc.canvas_course_id and not existing.canvas_course_id:
                existing.canvas_course_id = lc.canvas_course_id
                changed = True
            if lc.ed_course_id and not existing.ed_course_id:
                existing.ed_course_id = lc.ed_course_id
                changed = True
            if lc.canvas_name and existing.name == existing.code:
                existing.name = lc.canvas_name
                changed = True
            if changed:
                count += 1
        else:
            course = Course(
                user_id=user_id,
                code=lc.course_code,
                semester=lc.semester or "",
                name=lc.canvas_name or lc.ed_name or lc.course_code,
                canvas_course_id=lc.canvas_course_id,
                ed_course_id=lc.ed_course_id,
                credit_points=6,
            )
            session.add(course)
            count += 1

    await session.flush()
    return count


async def sync_all_courses() -> None:
    """Discover and create Course records for all users with tokens."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(Profile.canvas_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_courses_skip", reason="no users with canvas tokens")
        return

    encryption = get_encryption()
    settings = get_settings()

    for user in users:
        started_at = datetime.now(UTC)
        sync_status = "success"
        sync_error: str | None = None
        records_updated = 0

        for attempt in range(_MAX_RETRIES):
            try:
                # Fetch Canvas courses
                canvas_token = encryption.decrypt(str(user.canvas_api_token_encrypted))
                from src.adapters.canvas import CanvasAdapter

                canvas_adapter = CanvasAdapter(canvas_token)
                try:
                    canvas_courses = await canvas_adapter.get_courses()
                finally:
                    await canvas_adapter.close()

                # Fetch Ed courses via /api/user (returns enrolled courses)
                ed_courses: list[dict[str, object]] = []
                if user.ed_api_token_encrypted:
                    ed_token = encryption.decrypt(str(user.ed_api_token_encrypted))
                    import httpx

                    try:
                        async with httpx.AsyncClient(
                            base_url=settings.ed_base_url,
                            headers={"Authorization": f"Bearer {ed_token}"},
                            timeout=15.0,
                        ) as client:
                            resp = await client.get("/user")
                            if resp.status_code == 200:
                                data = resp.json()
                                if isinstance(data, dict):
                                    courses_list = data.get("courses", [])
                                    if isinstance(courses_list, list):
                                        ed_courses = courses_list
                    except Exception:
                        logger.warning("sync_courses_ed_failed", user_id=str(user.id))

                # Link Canvas + Ed courses by code + semester
                linked = link_courses(canvas_courses, ed_courses)

                logger.info(
                    "sync_courses_discovered",
                    user_id=str(user.id),
                    canvas=len(canvas_courses),
                    ed=len(ed_courses),
                    linked=sum(1 for lc in linked if lc.is_linked),
                    total=len(linked),
                )

                # Upsert to database
                async with session_factory() as session:
                    records_updated = await _upsert_courses(session, user.id, linked)
                    await session.commit()

                break  # Success
            except TokenInvalidError:
                sync_status = "failed"
                sync_error = "Token expired"
                break
            except Exception as exc:
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(
                        "sync_courses_retry",
                        user_id=str(user.id),
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(2**attempt)
                else:
                    sync_status = "failed"
                    sync_error = str(exc)[:500]
                    logger.error(
                        "sync_courses_failed",
                        user_id=str(user.id),
                        exc_info=True,
                    )

        await _record_sync_history(
            session_factory,
            user.id,
            "courses",
            sync_status,
            records_updated=records_updated,
            error_message=sync_error,
            started_at=started_at,
        )

        async with session_factory() as session:
            profile = await session.get(Profile, user.id)
            if profile:
                profile.canvas_sync_status = sync_status
                profile.canvas_last_synced_at = datetime.now(UTC)
                if sync_status == "success":
                    profile.canvas_token_status = "active"
                await session.commit()
