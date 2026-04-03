"""Deadline sync tasks — aggregate deadlines from Canvas + Ed for all users."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import structlog
from sqlalchemy import select

from src.models.course import Course
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.services.deadline import DeadlineService
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


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
