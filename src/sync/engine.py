"""Background sync engine using APScheduler 3.11 AsyncIOScheduler."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI

from src.config import get_settings

logger = structlog.get_logger()

# Module-level scheduler -- initialized in lifespan
scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler | None:
    """Return the current scheduler instance (None if not started)."""
    return scheduler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage sync engine lifecycle within FastAPI application."""
    global scheduler  # noqa: PLW0603

    # Allow disabling sync for tests
    if os.environ.get("UNIBOARD_DISABLE_SYNC") == "true":
        yield
        return

    # Import tasks here to avoid circular imports when sync is disabled
    from src.sync import (
        check_deadline_reminders,
        check_token_health,
        generate_daily_digests,
        sync_all_deadlines,
        sync_all_grades,
        sync_all_modules,
        sync_all_outlines,
        sync_ed_discussions,
    )

    settings = get_settings()
    scheduler = AsyncIOScheduler(timezone="UTC")

    # Register sync jobs with configurable intervals
    scheduler.add_job(
        sync_all_grades,
        IntervalTrigger(minutes=settings.sync_grades_interval_min),
        id="sync_grades",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        sync_all_deadlines,
        IntervalTrigger(minutes=settings.sync_deadlines_interval_min),
        id="sync_deadlines",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        sync_all_modules,
        CronTrigger(hour=settings.sync_modules_cron_hour, minute=0),
        id="sync_modules",
        replace_existing=True,
        max_instances=1,
    )
    # Unit Outline sync -- semester-initial (March 1, August 1, AEST)
    scheduler.add_job(
        sync_all_outlines,
        CronTrigger(
            month=settings.sync_outline_cron_months,
            day=settings.sync_outline_cron_day,
            hour=4,
            minute=0,
            timezone="Australia/Sydney",
        ),
        id="sync_outlines",
        replace_existing=True,
        max_instances=1,
    )

    # Deadline reminder checks (every N minutes)
    scheduler.add_job(
        check_deadline_reminders,
        IntervalTrigger(minutes=settings.reminder_check_interval_min),
        id="check_deadline_reminders",
        replace_existing=True,
        max_instances=1,
    )
    # Daily digest generation (AEST timezone for DST correctness)
    scheduler.add_job(
        generate_daily_digests,
        CronTrigger(
            hour=settings.digest_cron_hour_aest,
            minute=0,
            timezone="Australia/Sydney",
        ),
        id="generate_daily_digests",
        replace_existing=True,
        max_instances=1,
    )

    # Token health check (runs alongside reminders, same interval)
    scheduler.add_job(
        check_token_health,
        IntervalTrigger(minutes=settings.reminder_check_interval_min),
        id="check_token_health",
        replace_existing=True,
        max_instances=1,
    )

    # Ed Discussion thread sync (same interval as deadlines)
    scheduler.add_job(
        sync_ed_discussions,
        IntervalTrigger(minutes=settings.sync_deadlines_interval_min),
        id="sync_ed_discussions",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()
    logger.info(
        "sync_engine_started",
        grades_interval_min=settings.sync_grades_interval_min,
        deadlines_interval_min=settings.sync_deadlines_interval_min,
        modules_cron_hour=settings.sync_modules_cron_hour,
        outline_cron_months=settings.sync_outline_cron_months,
        reminder_check_interval_min=settings.reminder_check_interval_min,
        digest_cron_hour_aest=settings.digest_cron_hour_aest,
        token_health_interval_min=settings.reminder_check_interval_min,
        ed_discussions_interval_min=settings.sync_deadlines_interval_min,
    )

    # Stagger initial sync jobs to prevent connection pool exhaustion.
    # Each job starts 5 seconds after the previous one.
    now = datetime.utcnow()  # noqa: DTZ003
    initial_jobs: list[tuple[str, object]] = [
        ("initial_grades_sync", sync_all_grades),
        ("initial_deadlines_sync", sync_all_deadlines),
        ("initial_modules_sync", sync_all_modules),
        ("initial_outlines_sync", sync_all_outlines),
        ("initial_ed_discussions_sync", sync_ed_discussions),
    ]
    for i, (job_id, job_fn) in enumerate(initial_jobs):
        scheduler.add_job(
            job_fn,
            DateTrigger(run_date=now + timedelta(seconds=5 * i)),
            id=job_id,
            replace_existing=True,
        )

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        scheduler = None
        # Dispose sync engine connection pool
        from src.sync._shared import dispose_sync_engine
        await dispose_sync_engine()
        # Dispose main database engine connection pool
        from src.database import dispose_engine
        await dispose_engine()
        logger.info("sync_engine_stopped")
