"""Unit Outline sync tasks — fetch and parse USYD unit outlines."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.models.course import Course
from src.models.unit_outline import UnitOutline
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()


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
                        "fetched_at": now,
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
