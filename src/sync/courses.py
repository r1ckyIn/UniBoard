"""Course discovery sync — creates Course records from Canvas + Ed APIs."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.canvas import CanvasAdapter
from src.config import get_settings
from src.models.course import Course
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.services.course_linking import LinkedCourse, link_courses
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


async def _resolve_unit_outline_url(
    adapter: CanvasAdapter, canvas_course_id: str
) -> str | None:
    """Resolve USYD Unit Outline URL via Canvas tabs -> external_tools flow.

    Canvas exposes Unit Outline URLs via LTI External Tool configuration.
    Two calls needed (see TRD section 2.2):
      1. GET /courses/{id}/tabs -> find tab with label starting "Unit Outline"
      2. GET /courses/{id}/external_tools/{tool_id} -> read custom_fields.url

    Returns None (never raises) on any failure or missing data.
    """
    try:
        tabs = await adapter.get_tabs(canvas_course_id)
    except Exception:
        logger.warning("outline_url_tabs_failed", course_id=canvas_course_id)
        return None

    outline_tab = next(
        (
            t
            for t in tabs
            if isinstance(t.get("label"), str)
            and str(t["label"]).startswith("Unit Outline")
        ),
        None,
    )
    if outline_tab is None:
        return None

    tab_id = str(outline_tab.get("id", ""))
    prefix = "context_external_tool_"
    if not tab_id.startswith(prefix):
        return None
    tool_id = tab_id.removeprefix(prefix)

    try:
        tool = await adapter.get_external_tool(canvas_course_id, tool_id)
    except Exception:
        logger.warning("outline_url_tool_failed", course_id=canvas_course_id)
        return None

    custom_fields = tool.get("custom_fields")
    if not isinstance(custom_fields, dict):
        return None
    url = custom_fields.get("url")
    if isinstance(url, str) and url.startswith("https://sydney.edu.au/units/"):
        return url
    return None


async def _upsert_courses(
    session: AsyncSession,
    user_id: uuid.UUID,
    linked: list[LinkedCourse],
    adapter: CanvasAdapter | None = None,
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

        course: Course
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
            course = existing
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

        # SYNC-FIX-01: Populate unit_outline_url on first discovery.
        # Gate on adapter being supplied AND existing row's URL being NULL so
        # we do not make redundant Canvas API calls on every sync tick.
        if (
            adapter is not None
            and lc.canvas_course_id
            and course.unit_outline_url is None
        ):
            resolved_url = await _resolve_unit_outline_url(
                adapter, lc.canvas_course_id
            )
            if resolved_url:
                course.unit_outline_url = resolved_url
                logger.info(
                    "unit_outline_url_resolved",
                    course_id=str(course.id),
                    canvas_course_id=lc.canvas_course_id,
                )

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

                canvas_adapter = CanvasAdapter(canvas_token)
                try:
                    canvas_courses = await canvas_adapter.get_courses()

                    # Fetch Ed courses via /api/user (returns enrolled courses)
                    ed_courses: list[dict[str, object]] = []
                    if user.ed_api_token_encrypted:
                        ed_token = encryption.decrypt(
                            str(user.ed_api_token_encrypted)
                        )
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
                            logger.warning(
                                "sync_courses_ed_failed", user_id=str(user.id)
                            )

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

                    # Upsert to database — pass adapter so SYNC-FIX-01 helper
                    # can resolve unit_outline_url on first discovery.
                    async with session_factory() as session:
                        records_updated = await _upsert_courses(
                            session, user.id, linked, adapter=canvas_adapter
                        )
                        await session.commit()
                finally:
                    await canvas_adapter.close()

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
