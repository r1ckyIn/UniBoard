"""Sync task functions for grades, deadlines, modules, and outlines."""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import delete, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import get_settings
from src.models.course import Course
from src.models.grade import Grade
from src.models.lesson import Lesson
from src.models.module import Module, ModuleItem
from src.models.unit_outline import UnitOutline
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.services.deadline import DeadlineService

logger = structlog.get_logger()

# Maximum retry attempts for transient failures
_MAX_RETRIES = 3

# Singleton engine to avoid leaking connection pools on repeated sync calls
_sync_engine: AsyncEngine | None = None


def _get_sync_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create a session factory for sync tasks (outside HTTP request context).

    Reuses a single engine instance to avoid connection pool leaks.
    """
    global _sync_engine  # noqa: PLW0603
    if _sync_engine is None:
        settings = get_settings()
        _sync_engine = create_async_engine(settings.database_url, pool_size=3)
    return async_sessionmaker(_sync_engine, class_=AsyncSession, expire_on_commit=False)


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
            assignments = await adapter.get_assignments(course_id)

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
        await _record_sync_history(
            session_factory,
            user.id,
            "grades",
            sync_status,
            records_updated=records_updated,
            error_message=sync_error,
            started_at=started_at,
        )


async def sync_all_deadlines() -> None:
    """Sync deadlines for all users from Canvas + Ed."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(Profile.canvas_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_deadlines_skip", reason="no users with tokens")
        return

    encryption = get_encryption()

    for user in users:
        started_at = datetime.now(UTC)
        sync_status = "success"
        sync_error: str | None = None
        records_updated = 0
        for attempt in range(_MAX_RETRIES):
            try:
                token = encryption.decrypt(str(user.canvas_api_token_encrypted))

                async with session_factory() as session:
                    user_in_session = await session.get(Profile, user.id)
                    if user_in_session is None:
                        break

                    # Get user courses
                    courses_result = await session.execute(
                        select(Course).where(Course.user_id == user.id)
                    )
                    courses = list(courses_result.scalars().all())

                    from src.adapters.canvas import CanvasAdapter

                    adapter = CanvasAdapter(token)
                    try:
                        svc = DeadlineService(session)

                        for course in courses:
                            if not course.canvas_course_id:
                                continue

                            try:
                                assignments = await adapter.get_assignments(
                                    course.canvas_course_id
                                )
                            except TokenInvalidError:
                                user_in_session.canvas_token_status = "expired"
                                user_in_session.canvas_sync_status = "degraded"
                                await session.commit()
                                break
                            except Exception:
                                logger.warning(
                                    "sync_deadlines_course_error",
                                    course=course.code,
                                )
                                continue

                            # Ed Lessons deadlines
                            ed_lessons_data: list[dict[str, object]] = []
                            if user_in_session.ed_api_token_encrypted:
                                from src.adapters.ed_lessons import EdLessonsAdapter

                                ed_token = encryption.decrypt(
                                    str(user_in_session.ed_api_token_encrypted)
                                )
                                ed_lessons_adapter = EdLessonsAdapter(ed_token)
                                try:
                                    if course.ed_course_id:
                                        lessons, _ = await ed_lessons_adapter.get_lessons(
                                            course.ed_course_id
                                        )
                                        ed_lessons_data = [
                                            lesson_item
                                            for lesson_item in lessons
                                            if lesson_item.get("due_at")
                                        ]
                                except TokenInvalidError:
                                    user_in_session.ed_token_status = "expired"
                                    user_in_session.ed_sync_status = "degraded"
                                except Exception:
                                    logger.warning(
                                        "sync_ed_lessons_deadline_error",
                                        course=course.code,
                                    )
                                finally:
                                    await ed_lessons_adapter.close()

                            # Ed Discussion deadline mentions
                            ed_discussion_texts: list[tuple[str, str]] = []
                            if (
                                user_in_session.ed_api_token_encrypted
                                and course.ed_course_id
                            ):
                                from src.adapters.ed_discussion import EdDiscussionAdapter

                                ed_disc_token = encryption.decrypt(
                                    str(user_in_session.ed_api_token_encrypted)
                                )
                                ed_disc_adapter = EdDiscussionAdapter(ed_disc_token)
                                try:
                                    threads = await ed_disc_adapter.get_threads(
                                        course.ed_course_id
                                    )
                                    ed_discussion_texts = [
                                        (
                                            str(t.get("content", "")),
                                            str(t.get("id", "")),
                                        )
                                        for t in threads
                                        if t.get("content")
                                    ]
                                except TokenInvalidError:
                                    user_in_session.ed_token_status = "expired"
                                    user_in_session.ed_sync_status = "degraded"
                                except Exception:
                                    logger.warning(
                                        "sync_ed_disc_deadline_error",
                                        course=course.code,
                                    )
                                finally:
                                    await ed_disc_adapter.close()

                            records_updated += await svc.aggregate_and_dedup(
                                course,
                                canvas_assignments=assignments,
                                ed_lessons_data=ed_lessons_data,
                                ed_discussion_texts=ed_discussion_texts,
                            )

                        await session.commit()
                    finally:
                        await adapter.close()

                break  # Success
            except TokenInvalidError:
                sync_status = "failed"
                sync_error = "Token expired"
                break  # Don't retry on auth errors
            except Exception as exc:
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(
                        "sync_deadlines_retry",
                        user_id=str(user.id),
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(2**attempt)
                else:
                    sync_status = "failed"
                    sync_error = str(exc)[:500]
                    logger.error(
                        "sync_deadlines_failed",
                        user_id=str(user.id),
                        exc_info=True,
                    )
        await _record_sync_history(
            session_factory,
            user.id,
            "deadlines",
            sync_status,
            records_updated=records_updated,
            error_message=sync_error,
            started_at=started_at,
        )


async def sync_all_modules() -> None:
    """Sync Canvas modules and Ed Lessons for all users."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(
                or_(
                    Profile.canvas_api_token_encrypted.isnot(None),
                    Profile.ed_api_token_encrypted.isnot(None),
                )
            )
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_modules_skip", reason="no users with tokens")
        return

    encryption = get_encryption()

    for user in users:
        started_at = datetime.now(UTC)
        sync_status = "success"
        sync_error: str | None = None
        records_updated = 0
        for attempt in range(_MAX_RETRIES):
            try:
                async with session_factory() as session:
                    user_in_session = await session.get(Profile, user.id)
                    if user_in_session is None:
                        break

                    courses_result = await session.execute(
                        select(Course).where(Course.user_id == user.id)
                    )
                    courses = list(courses_result.scalars().all())

                    # --- Canvas modules ---
                    if user.canvas_api_token_encrypted:
                        token = encryption.decrypt(str(user.canvas_api_token_encrypted))
                        await _sync_canvas_modules(
                            user_in_session, token, courses, session
                        )

                    # --- Ed Lessons ---
                    if user.ed_api_token_encrypted:
                        ed_token = encryption.decrypt(str(user.ed_api_token_encrypted))
                        await _sync_ed_lessons(
                            user_in_session, ed_token, courses, session
                        )

                    await session.commit()

                break  # Success
            except TokenInvalidError:
                sync_status = "failed"
                sync_error = "Token expired"
                break  # Don't retry on auth errors
            except Exception as exc:
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(
                        "sync_modules_retry",
                        user_id=str(user.id),
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(2**attempt)
                else:
                    sync_status = "failed"
                    sync_error = str(exc)[:500]
                    logger.error(
                        "sync_modules_failed",
                        user_id=str(user.id),
                        exc_info=True,
                    )
        await _record_sync_history(
            session_factory,
            user.id,
            "modules",
            sync_status,
            records_updated=records_updated,
            error_message=sync_error,
            started_at=started_at,
        )


async def _sync_canvas_modules(
    user: Profile,
    token: str,
    courses: list[Course],
    session: AsyncSession,
) -> None:
    """Sync Canvas modules and items for a user."""
    from src.adapters.canvas import CanvasAdapter

    adapter = CanvasAdapter(token)
    try:
        for course in courses:
            if not course.canvas_course_id:
                continue

            try:
                modules_data = await adapter.get_modules(course.canvas_course_id)
            except TokenInvalidError:
                user.canvas_token_status = "expired"
                raise
            except Exception:
                logger.warning("sync_modules_course_error", course=course.code)
                continue

            for mod_data in modules_data:
                mod_name = str(mod_data.get("name", ""))
                mod_id_str = str(mod_data.get("id", ""))
                position = int(str(mod_data.get("position", 0)))

                # Upsert module by (course_id, canvas_module_id) natural key
                mod_values = {
                    "id": uuid.uuid4(),
                    "course_id": course.id,
                    "canvas_module_id": mod_id_str,
                    "name": mod_name,
                    "position": position,
                }
                mod_insert = pg_insert(Module).values(**mod_values)
                mod_returning = mod_insert.on_conflict_do_update(
                    constraint="uq_modules_course_canvas",
                    set_={
                        "name": mod_values["name"],
                        "position": mod_values["position"],
                    },
                ).returning(Module.id)
                result = await session.execute(mod_returning)
                actual_module_id = result.scalar_one()

                # Delete old items and re-insert (no stable external key for items)
                await session.execute(
                    delete(ModuleItem).where(ModuleItem.module_id == actual_module_id)
                )

                items = mod_data.get("items", [])
                if isinstance(items, list):
                    for item_data in items:
                        if not isinstance(item_data, dict):
                            continue
                        item = ModuleItem(
                            module_id=actual_module_id,
                            title=str(item_data.get("title", "")),
                            type=str(item_data.get("type", "")),
                            content_id=str(item_data.get("content_id", "")) or None,
                            url=str(item_data.get("html_url", "")) or None,
                        )
                        session.add(item)
    finally:
        await adapter.close()


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


async def _sync_ed_lessons(
    user: Profile,
    ed_token: str,
    courses: list[Course],
    session: AsyncSession,
) -> None:
    """Sync Ed Lessons for a user, including slide content for tsvector."""
    from src.adapters.ed_lessons import EdLessonsAdapter

    adapter = EdLessonsAdapter(ed_token)
    try:
        for course in courses:
            if not course.ed_course_id:
                continue

            try:
                lessons_data, _ = await adapter.get_lessons(course.ed_course_id)
            except Exception:
                logger.warning("sync_ed_lessons_error", course=course.code)
                continue

            for lesson_data in lessons_data:
                lesson_id_str = str(lesson_data.get("id", ""))
                title = str(lesson_data.get("title", ""))
                if not lesson_id_str or not title:
                    continue

                # Fetch full lesson with slides for text_content
                text_content = None
                slide_count = int(str(lesson_data.get("slide_count", 0)))
                if slide_count > 0:
                    detail = await adapter.get_lesson(lesson_id_str)
                    slides = detail.get("slides", [])
                    if isinstance(slides, list):
                        slide_texts = [
                            str(s.get("content", ""))
                            for s in slides
                            if isinstance(s, dict) and s.get("content")
                        ]
                        if slide_texts:
                            text_content = "\n\n".join(slide_texts)

                # Upsert lesson by (course_id, ed_lesson_id)
                values = {
                    "id": uuid.uuid4(),
                    "course_id": course.id,
                    "ed_lesson_id": lesson_id_str,
                    "title": title,
                    "number": lesson_data.get("number"),
                    "kind": str(lesson_data.get("kind", "")),
                    "state": str(lesson_data.get("state", "")),
                    "slide_count": slide_count,
                    "due_at": lesson_data.get("due_at"),
                    "text_content": text_content,
                }
                lesson_stmt = pg_insert(Lesson).values(**values)
                lesson_stmt = lesson_stmt.on_conflict_do_update(
                    constraint="uq_lessons_course_ed",
                    set_={
                        "title": values["title"],
                        "number": values["number"],
                        "kind": values["kind"],
                        "state": values["state"],
                        "slide_count": values["slide_count"],
                        "due_at": values["due_at"],
                        "text_content": values["text_content"],
                    },
                )
                await session.execute(lesson_stmt)

        user.ed_sync_status = "success"
        user.ed_last_synced_at = datetime.now(UTC)
        user.ed_token_status = "active"

    except TokenInvalidError:
        user.ed_token_status = "expired"
        user.ed_sync_status = "degraded"
        logger.warning("sync_ed_token_expired", user_id=str(user.id))


async def _record_sync_history(
    session_factory: async_sessionmaker[AsyncSession],
    user_id: uuid.UUID,
    domain: str,
    status: str,
    records_updated: int = 0,
    error_message: str | None = None,
    started_at: datetime | None = None,
) -> None:
    """Insert a sync_history record for audit trail."""
    from src.models.sync_history import SyncHistory

    now = datetime.now(UTC)
    async with session_factory() as session:
        entry = SyncHistory(
            user_id=user_id,
            domain=domain,
            status=status,
            records_updated=records_updated,
            error_message=error_message,
            started_at=started_at or now,
            completed_at=now,
        )
        session.add(entry)
        await session.commit()


async def sync_all_outlines() -> None:
    """Sync Unit Outlines for all courses with unit_outline_url."""
    from src.parsers.usyd_outline import UnitOutlineParser

    session_factory = _get_sync_session_factory()
    parser = UnitOutlineParser()

    async with session_factory() as session:
        result = await session.execute(
            select(Course).where(Course.unit_outline_url.isnot(None))
        )
        courses = list(result.scalars().all())

    if not courses:
        logger.info("sync_outlines_skip", reason="no courses with outline URLs")
        return

    user_results: dict[uuid.UUID, tuple[int, str, str | None]] = {}

    for course in courses:
        user_id = course.user_id
        if user_id not in user_results:
            user_results[user_id] = (0, "success", None)

        for attempt in range(_MAX_RETRIES):
            try:
                parse_result = await parser.fetch_and_parse(
                    str(course.unit_outline_url)
                )

                async with session_factory() as session:
                    # Determine semester string from current date
                    now = datetime.now(UTC)
                    semester = f"S{'1' if now.month <= 6 else '2'}_{now.year}"

                    values = {
                        "id": uuid.uuid4(),
                        "course_id": course.id,
                        "outline_url": str(course.unit_outline_url),
                        "assessments": [
                            {
                                "name": a.name,
                                "weight": a.weight,
                                "description": a.description,
                                "due_date": a.due_date,
                                "length": a.length,
                                "ai_policy": a.ai_policy,
                            }
                            for a in parse_result.assessments
                        ],
                        "learning_outcomes": parse_result.learning_outcomes,
                        "raw_html": parse_result.raw_html,
                        "fetched_at": datetime.now(UTC).replace(tzinfo=None),
                        "semester": semester,
                    }

                    insert_stmt = pg_insert(UnitOutline).values(**values)
                    insert_stmt = insert_stmt.on_conflict_do_update(
                        constraint="uq_unit_outlines_course_semester",
                        set_={
                            "assessments": values["assessments"],
                            "learning_outcomes": values["learning_outcomes"],
                            "raw_html": values["raw_html"],
                            "fetched_at": values["fetched_at"],
                            "outline_url": values["outline_url"],
                        },
                    )
                    await session.execute(insert_stmt)
                    await session.commit()

                count, status, err = user_results[user_id]
                user_results[user_id] = (count + 1, status, err)
                logger.info("sync_outline_success", course=course.code)
                break  # Success
            except Exception:
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(
                        "sync_outline_retry",
                        course=course.code,
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(2**attempt)
                else:
                    count, _, _ = user_results[user_id]
                    user_results[user_id] = (
                        count,
                        "failed",
                        f"Failed to sync {course.code}",
                    )
                    logger.error(
                        "sync_outline_failed",
                        course=course.code,
                        exc_info=True,
                    )

    # Record sync history per user
    for uid, (count, status, err) in user_results.items():
        await _record_sync_history(
            session_factory,
            uid,
            "outlines",
            status,
            records_updated=count,
            error_message=err,
        )
