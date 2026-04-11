"""Ed Discussion sync tasks — sync threads and trigger AI evaluation."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.config import get_settings
from src.models.course import Course
from src.models.discussion import DiscussionThread
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.sync._shared import _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


async def sync_ed_discussions() -> None:
    """Sync Ed Discussion threads into discussion_threads table for all users.

    After thread sync, triggers AI evaluation for newly synced courses
    when an Anthropic API key is configured (D-06).
    """
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(Profile.ed_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        logger.info("sync_ed_discussions_skip", reason="no users with ed tokens")
        return

    encryption = get_encryption()
    settings = get_settings()
    synced_courses: dict[uuid.UUID, list[uuid.UUID]] = {}

    for user in users:
        started_at = datetime.now(UTC)
        sync_status = "success"
        sync_error: str | None = None
        records_updated = 0

        try:
            ed_token = encryption.decrypt(str(user.ed_api_token_encrypted))

            async with session_factory() as session:
                user_in_session = await session.get(Profile, user.id)
                if user_in_session is None:
                    continue

                courses_result = await session.execute(
                    select(Course).where(Course.user_id == user.id)
                )
                courses = list(courses_result.scalars().all())

                from src.adapters.ed_discussion import EdDiscussionAdapter

                adapter = EdDiscussionAdapter(ed_token)
                try:
                    for course in courses:
                        if not course.ed_course_id:
                            continue

                        try:
                            threads = await adapter.get_threads(course.ed_course_id)
                        except TokenInvalidError:
                            user_in_session.ed_token_status = "expired"
                            user_in_session.ed_sync_status = "degraded"
                            await session.commit()
                            logger.warning(
                                "sync_ed_disc_token_expired",
                                user_id=str(user.id),
                            )
                            break
                        except Exception:
                            logger.warning(
                                "sync_ed_disc_course_error",
                                course=course.code,
                            )
                            continue

                        now = datetime.now(UTC)

                        for t in threads:
                            ed_thread_id = str(t.get("id", ""))
                            title = str(t.get("title", ""))
                            if not ed_thread_id or not title:
                                continue

                            # Detect staff post from user.course_role
                            user_info = t.get("user")
                            is_staff = False
                            author = "Unknown"
                            if isinstance(user_info, dict):
                                role = str(user_info.get("course_role", ""))
                                is_staff = role in ("admin", "staff")
                                author = str(user_info.get("id", "Unknown"))

                            values = {
                                "id": uuid.uuid4(),
                                "course_id": course.id,
                                "ed_thread_id": ed_thread_id,
                                "title": title,
                                "author": author,
                                "category": str(t.get("category", "")),
                                "content": t.get("content"),
                                "is_endorsed": bool(t.get("is_endorsed", False)),
                                "is_staff_post": is_staff,
                                "synced_at": now,
                            }

                            insert_stmt = pg_insert(DiscussionThread).values(**values)
                            insert_stmt = insert_stmt.on_conflict_do_update(
                                index_elements=["course_id", "ed_thread_id"],
                                set_={
                                    "title": values["title"],
                                    "author": values["author"],
                                    "category": values["category"],
                                    "content": values["content"],
                                    "is_endorsed": values["is_endorsed"],
                                    "is_staff_post": values["is_staff_post"],
                                    "synced_at": values["synced_at"],
                                },
                            )
                            await session.execute(insert_stmt)
                            records_updated += 1

                        # Track synced courses for post-sync AI evaluation
                        if user.id not in synced_courses:
                            synced_courses[user.id] = []
                        synced_courses[user.id].append(course.id)

                    await session.commit()
                finally:
                    await adapter.close()

        except TokenInvalidError:
            sync_status = "failed"
            sync_error = "Token expired"
        except Exception as exc:
            sync_status = "failed"
            sync_error = str(exc)[:500]
            logger.error(
                "sync_ed_discussions_failed",
                user_id=str(user.id),
                exc_info=True,
            )

        await _record_sync_history(
            session_factory,
            user.id,
            "ed_discussions",
            sync_status,
            records_updated=records_updated,
            error_message=sync_error,
            started_at=started_at,
        )

    # Post-sync AI evaluation hook (D-06)
    if settings.anthropic_api_key and synced_courses:
        await _evaluate_synced_threads(session_factory, synced_courses)


async def _evaluate_synced_threads(
    session_factory: async_sessionmaker[AsyncSession],
    course_ids_by_user: dict[uuid.UUID, list[uuid.UUID]],
) -> None:
    """Batch evaluate unscored threads per user/course after Ed Discussion sync.

    Lazy imports AIEngine and EdIntelligenceService to avoid circular imports.
    Wraps each user/course in try/except for graceful degradation.
    """
    from src.services.ai_engine import AIEngine
    from src.services.intelligence import EdIntelligenceService

    settings = get_settings()
    ai_engine = AIEngine(api_key=settings.anthropic_api_key)

    for user_id, course_ids in course_ids_by_user.items():
        try:
            async with session_factory() as session:
                svc = EdIntelligenceService(session)
                for course_id in course_ids:
                    await svc.evaluate_new_threads_ai(user_id, course_id, ai_engine)
                await session.commit()
        except Exception:
            logger.warning(
                "evaluate_synced_threads_failed",
                user_id=str(user_id),
                exc_info=True,
            )
