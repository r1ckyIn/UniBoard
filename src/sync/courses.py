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


def _flatten_ed_courses(
    raw: list[object],
) -> list[dict[str, object]]:
    """Normalise Ed ``/user`` enrolment entries into a ``link_courses``-ready
    shape.

    Ed returns enrolments as ``[{course: {id, code, name, year, session,
    status, ...}, role: ..., ...}, ...]`` -- the course metadata is nested
    inside ``course`` and ``course.name`` omits the course code (it carries
    the short title like "Introduction to Programming"). Feeding that shape
    directly into ``link_courses`` produced two independent regressions:

    1. ``ec.get("name")`` returned ``""`` (name was on the nested object).
    2. Even if the nested name were used, it has no ``COMP2017`` / semester
       tokens, so ``extract_course_code`` / ``extract_semester`` always
       returned ``None`` and every user landed in the unlinked branch.

    This helper:
      * unwraps the nested ``course`` dict,
      * drops ``status == "archived"`` entries so old semesters do not
        shadow the current one during multi-candidate tie-breaking,
      * synthesises ``{"id", "name"}`` dicts where the name is
        ``"{code} ({year} {session})"`` -- a string that both
        ``extract_course_code`` and ``extract_semester`` recognise.
    """
    flat: list[dict[str, object]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        nested = item.get("course")
        course = nested if isinstance(nested, dict) else item
        if not isinstance(course, dict):
            continue
        if str(course.get("status", "")).lower() == "archived":
            continue
        code = str(course.get("code", "")).strip()
        year = str(course.get("year", "")).strip()
        session_str = str(course.get("session", "")).strip()
        course_id = course.get("id", "")
        if not code or not course_id:
            continue
        # Compose a name that link_courses can parse.
        if year and session_str:
            name = f"{code} ({year} {session_str})"
        elif year:
            name = f"{code} ({year})"
        else:
            # Fall back to whatever Ed called the course -- link_courses will
            # hit the code-only index path and match on code alone.
            name = f"{code} {course.get('name', '')}".strip()
        flat.append({"id": course_id, "name": name})
    return flat


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
    """Upsert Course records from linked course data. Returns count of records.

    Skips Ed-only LinkedCourse entries (canvas_course_id is None). UniBoard
    is Canvas-centric: every user-visible course must be an active Canvas
    enrolment. Ed-only rows would otherwise leak COMP2123 / INFO1113 style
    artefacts into the course list even though the user dropped them on the
    Canvas side.

    Lookup for existing rows tries the (user_id, code, semester) natural
    key first, then falls back to (user_id, code) to catch pre-#111 rows
    that were written with semester="" because the Canvas feed did not
    expose a semester token -- otherwise a second sync after #111 landed
    would create a duplicate course and orphan the UUIDs that the frontend
    already bookmarked.

    After the upsert loop, also purges any pre-#113 zombie rows for this
    user whose canvas_course_id is NULL. Those rows can no longer be
    produced (the Ed-only skip above prevents it), but Ed-only entries
    written before that guard still linger and leak into /courses. Uses
    ORM-level delete so cascade="all, delete-orphan" cleans up associated
    grades / modules / lessons / deadlines / unit_outlines / threads.
    """
    count = 0
    for lc in linked:
        if not lc.course_code:
            continue
        if not lc.canvas_course_id:
            # Drop Ed-only enrolments -- users see Canvas-anchored courses.
            logger.info(
                "course_upsert_skip_ed_only",
                user_id=str(user_id),
                course_code=lc.course_code,
                ed_course_id=lc.ed_course_id,
            )
            continue

        target_semester = lc.semester or ""

        # Pull every row for (user_id, code) so we can deduplicate before
        # updating. A previous sync may have left an orphaned legacy row
        # (semester='') next to a populated row (semester='2026-S1') with
        # the same canvas_course_id. The frontend UUID was bookmarked on
        # the legacy row, so we keep that PK and merge the populated one
        # into it before deleting the duplicate.
        candidates = (
            await session.execute(
                select(Course).where(
                    Course.user_id == user_id,
                    Course.code == lc.course_code,
                )
            )
        ).scalars().all()

        canvas_matches = [
            c
            for c in candidates
            if c.canvas_course_id == lc.canvas_course_id
        ]

        existing: Course | None = None
        duplicates: list[Course] = []

        if canvas_matches:
            blank = next(
                (c for c in canvas_matches if (c.semester or "") == ""),
                None,
            )
            existing = blank or min(canvas_matches, key=lambda c: str(c.id))
            duplicates = [c for c in canvas_matches if c is not existing]
        else:
            primary = next(
                (c for c in candidates if (c.semester or "") == target_semester),
                None,
            )
            blank_semester = next(
                (c for c in candidates if (c.semester or "") == ""),
                None,
            )
            if primary is not None:
                existing = primary
            elif blank_semester is not None:
                existing = blank_semester
            elif len(candidates) == 1:
                existing = candidates[0]

        # Fold duplicates' populated fields into the row we keep, then drop
        # them. This cleans up the double-row artefact without orphaning
        # any grades/outlines that reference either UUID.
        for dup in duplicates:
            if existing is None:
                break
            if dup.ed_course_id and not existing.ed_course_id:
                existing.ed_course_id = dup.ed_course_id
            if dup.canvas_course_id and not existing.canvas_course_id:
                existing.canvas_course_id = dup.canvas_course_id
            if dup.unit_outline_url and not existing.unit_outline_url:
                existing.unit_outline_url = dup.unit_outline_url
            if dup.semester and not (existing.semester or ""):
                existing.semester = dup.semester
            logger.info(
                "course_upsert_merged_duplicate",
                kept_id=str(existing.id),
                dropped_id=str(dup.id),
                code=lc.course_code,
            )
            await session.delete(dup)

        course: Course
        if existing:
            # Update platform IDs and metadata in-place so we merge with
            # any legacy row rather than creating a duplicate.
            changed = False
            if lc.canvas_course_id and not existing.canvas_course_id:
                existing.canvas_course_id = lc.canvas_course_id
                changed = True
            if lc.ed_course_id and not existing.ed_course_id:
                existing.ed_course_id = lc.ed_course_id
                changed = True
            if target_semester and (existing.semester or "") != target_semester:
                existing.semester = target_semester
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
                semester=target_semester,
                name=lc.canvas_name or lc.ed_name or lc.course_code,
                canvas_course_id=lc.canvas_course_id,
                ed_course_id=lc.ed_course_id,
                credit_points=6,
            )
            session.add(course)
            count += 1

        # Populate unit_outline_url only on first discovery. Gate on adapter
        # being supplied AND existing row's URL being NULL so we do not make
        # redundant Canvas API calls on every sync tick.
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

    # Purge pre-#113 zombie rows: earlier syncs wrote Course records without
    # a canvas_course_id (Ed-only enrolments, now skipped at the head of
    # this loop). Those zombies still leak into /courses and the sidebar
    # picker. ORM-level delete so cascade="all, delete-orphan" tears down
    # attached grades/modules/lessons/deadlines/unit_outlines/threads.
    stale_rows = (
        await session.execute(
            select(Course).where(
                Course.user_id == user_id,
                Course.canvas_course_id.is_(None),
            )
        )
    ).scalars().all()
    for stale in stale_rows:
        logger.info(
            "course_upsert_purge_stale",
            user_id=str(user_id),
            course_id=str(stale.id),
            code=stale.code,
            semester=stale.semester,
        )
        await session.delete(stale)

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
                                            ed_courses = _flatten_ed_courses(
                                                courses_list
                                            )
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
