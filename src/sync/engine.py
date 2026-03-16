"""Background sync engine using APScheduler 3.11 AsyncIOScheduler."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
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
    from src.sync.tasks import (
        sync_all_deadlines,
        sync_all_grades,
        sync_all_modules,
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

    scheduler.start()
    logger.info(
        "sync_engine_started",
        grades_interval_min=settings.sync_grades_interval_min,
        deadlines_interval_min=settings.sync_deadlines_interval_min,
        modules_cron_hour=settings.sync_modules_cron_hour,
    )

    # Trigger initial full sync for all users
    scheduler.add_job(
        sync_all_grades, id="initial_grades_sync", replace_existing=True
    )
    scheduler.add_job(
        sync_all_deadlines, id="initial_deadlines_sync", replace_existing=True
    )
    scheduler.add_job(
        sync_all_modules, id="initial_modules_sync", replace_existing=True
    )

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        scheduler = None
        logger.info("sync_engine_stopped")
