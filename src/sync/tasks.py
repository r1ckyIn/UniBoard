"""Sync task functions for grades, deadlines, and modules."""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import get_settings
from src.models.course import Course
from src.models.grade import Grade
from src.models.module import Module, ModuleItem
from src.models.user import User
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.services.deadline import DeadlineService

logger = structlog.get_logger()

# Maximum retry attempts for transient failures
_MAX_RETRIES = 3


def _get_sync_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create a fresh session factory for sync tasks (outside HTTP request context)."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url, pool_size=3)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _sync_user_grades(
    user: User,
    canvas_token: str,
    session: AsyncSession,
) -> None:
    """Sync grades for a single user from Canvas."""
    from src.adapters.canvas import CanvasAdapter

    adapter = CanvasAdapter(canvas_token)
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


async def sync_all_grades() -> None:
    """Sync grades for all users with Canvas tokens."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(User).where(User.canvas_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_grades_skip", reason="no users with canvas tokens")
        return

    encryption = get_encryption()

    for user in users:
        for attempt in range(_MAX_RETRIES):
            try:
                token = encryption.decrypt(str(user.canvas_api_token_encrypted))
                async with session_factory() as session:
                    # Re-attach user to this session
                    user_in_session = await session.get(User, user.id)
                    if user_in_session is None:
                        break
                    await _sync_user_grades(user_in_session, token, session)
                break  # Success
            except TokenInvalidError:
                break  # Don't retry on auth errors
            except Exception:
                if attempt < _MAX_RETRIES - 1:
                    logger.warning(
                        "sync_grades_retry",
                        user_id=str(user.id),
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(2 ** attempt)
                else:
                    logger.error(
                        "sync_grades_failed",
                        user_id=str(user.id),
                    )
                    async with session_factory() as session:
                        user_in_session = await session.get(User, user.id)
                        if user_in_session is not None:
                            user_in_session.canvas_sync_status = "failed"
                            await session.commit()


async def sync_all_deadlines() -> None:
    """Sync deadlines for all users from Canvas + Ed."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(User).where(User.canvas_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_deadlines_skip", reason="no users with tokens")
        return

    encryption = get_encryption()

    for user in users:
        try:
            token = encryption.decrypt(str(user.canvas_api_token_encrypted))

            async with session_factory() as session:
                user_in_session = await session.get(User, user.id)
                if user_in_session is None:
                    continue

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

                        await svc.aggregate_and_dedup(
                            course,
                            canvas_assignments=assignments,
                            ed_lessons_data=[],
                            ed_discussion_texts=[],
                        )

                    await session.commit()
                finally:
                    await adapter.close()

        except TokenInvalidError:
            logger.warning(
                "sync_deadlines_token_expired",
                user_id=str(user.id),
            )
        except Exception:
            logger.error(
                "sync_deadlines_failed",
                user_id=str(user.id),
                exc_info=True,
            )


async def sync_all_modules() -> None:
    """Sync course modules and Ed Lessons for all users."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(User).where(User.canvas_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_modules_skip", reason="no users with tokens")
        return

    encryption = get_encryption()

    for user in users:
        try:
            token = encryption.decrypt(str(user.canvas_api_token_encrypted))

            async with session_factory() as session:
                courses_result = await session.execute(
                    select(Course).where(Course.user_id == user.id)
                )
                courses = list(courses_result.scalars().all())

                from src.adapters.canvas import CanvasAdapter

                adapter = CanvasAdapter(token)
                try:
                    for course in courses:
                        if not course.canvas_course_id:
                            continue

                        try:
                            modules_data = await adapter.get_modules(
                                course.canvas_course_id
                            )
                        except TokenInvalidError:
                            break
                        except Exception:
                            logger.warning(
                                "sync_modules_course_error",
                                course=course.code,
                            )
                            continue

                        for mod_data in modules_data:
                            mod_name = str(mod_data.get("name", ""))
                            mod_id_str = str(mod_data.get("id", ""))
                            position = int(str(mod_data.get("position", 0)))

                            # Upsert module
                            mod_values = {
                                "id": uuid.uuid4(),
                                "course_id": course.id,
                                "canvas_module_id": mod_id_str,
                                "name": mod_name,
                                "position": position,
                            }
                            mod_stmt = pg_insert(Module).values(**mod_values)
                            mod_stmt = mod_stmt.on_conflict_do_update(
                                index_elements=["id"],
                                set_={
                                    "name": mod_values["name"],
                                    "position": mod_values["position"],
                                },
                            )
                            await session.execute(mod_stmt)

                            # Process items
                            items = mod_data.get("items", [])
                            if isinstance(items, list):
                                for item_data in items:
                                    if not isinstance(item_data, dict):
                                        continue
                                    item_values = {
                                        "id": uuid.uuid4(),
                                        "module_id": mod_values["id"],
                                        "title": str(item_data.get("title", "")),
                                        "type": str(item_data.get("type", "")),
                                        "content_id": str(
                                            item_data.get("content_id", "")
                                        )
                                        or None,
                                        "url": str(item_data.get("html_url", ""))
                                        or None,
                                    }
                                    item_stmt = pg_insert(ModuleItem).values(
                                        **item_values
                                    )
                                    item_stmt = item_stmt.on_conflict_do_update(
                                        index_elements=["id"],
                                        set_={
                                            "title": item_values["title"],
                                            "type": item_values["type"],
                                        },
                                    )
                                    await session.execute(item_stmt)

                    await session.commit()
                finally:
                    await adapter.close()

        except Exception:
            logger.error(
                "sync_modules_failed",
                user_id=str(user.id),
                exc_info=True,
            )
