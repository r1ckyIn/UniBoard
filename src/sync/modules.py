"""Module sync tasks — sync Canvas modules and Ed Lessons for all users."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import delete, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.config import get_settings
from src.models.course import Course
from src.models.lesson import Lesson
from src.models.module import Module, ModuleItem
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


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

                # Post-sync translation for non-English users
                await _translate_user_courses(user, session_factory)

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


async def _translate_user_courses(
    user: Profile,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Batch translate course content for non-English users after sync."""
    settings = get_settings()
    if not settings.translation_enabled or not settings.anthropic_api_key:
        return

    if user.language_preference == "en":
        return

    from src.services.ai_engine import AIEngine
    from src.services.translation import TranslationService

    try:
        engine = AIEngine(api_key=settings.anthropic_api_key)

        async with session_factory() as session:
            stmt = select(Course).where(Course.user_id == user.id)
            result = await session.execute(stmt)
            courses = result.scalars().all()

            svc = TranslationService(session=session, ai_engine=engine)
            for course in courses:
                await svc.translate_course_content(course.id)

            await session.commit()
    except Exception:
        logger.warning("translation_sync_failed", user_id=str(user.id), exc_info=True)


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
    finally:
        await adapter.close()
