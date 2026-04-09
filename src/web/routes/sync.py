"""Sync trigger, status, and history REST endpoints."""

import asyncio
import uuid
from collections.abc import Callable, Coroutine
from datetime import datetime, timedelta
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Profile
from src.schemas.common import NotFoundError, RateLimitedError, SuccessResponse
from src.schemas.sync import (
    PlatformHealth,
    PlatformStatus,
    SyncCount,
    SyncDetail,
    SyncHistoryEntry,
    SyncHistoryResponse,
    SyncResults,
    SyncStatusResponse,
    SyncTriggerResponse,
)
from src.web.deps import get_current_user_id, get_request_meta, get_session

logger = structlog.get_logger()

# Manual sync cooldown period
_SYNC_COOLDOWN = timedelta(minutes=5)

router = APIRouter()


_ValidScope = Literal["all", "grades", "deadlines", "modules", "outline"]

# Module-level set to hold strong references to background sync tasks,
# preventing garbage collection mid-execution.
_background_tasks: set[asyncio.Task[None]] = set()


class SyncTriggerRequest(BaseModel):
    """Optional request body for manual sync trigger."""

    scope: _ValidScope = "all"


@router.post("/trigger")
async def trigger_sync(
    request: Request,
    body: SyncTriggerRequest | None = None,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[SyncTriggerResponse]:
    """Trigger a manual sync for the current user (throttled to 1 per 5 minutes)."""
    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

    now = datetime.utcnow()  # noqa: DTZ003 -- naive UTC for PostgreSQL TIMESTAMP

    # Check throttle
    if profile.last_manual_sync_at is not None:
        last = profile.last_manual_sync_at
        if now - last < _SYNC_COOLDOWN:
            next_allowed = last + _SYNC_COOLDOWN
            raise RateLimitedError(
                f"Manual sync rate limited. Next allowed at {next_allowed.isoformat()}"
            )

    # Update throttle timestamp and set sync status to "syncing"
    profile.last_manual_sync_at = now
    profile.last_sync_at = now
    profile.canvas_sync_status = "syncing"
    profile.ed_sync_status = "syncing"
    await session.flush()

    scope = body.scope if body else "all"
    next_allowed_at = now + _SYNC_COOLDOWN

    # Dispatch actual sync task in background based on scope.
    # Course discovery runs first so other tasks find Course records.
    from src.sync import (
        sync_all_courses,
        sync_all_deadlines,
        sync_all_grades,
        sync_all_modules,
        sync_all_outlines,
    )

    _SCOPE_DISPATCH: dict[str, Callable[[], Coroutine[Any, Any, None]]] = {
        "grades": sync_all_grades,
        "deadlines": sync_all_deadlines,
        "modules": sync_all_modules,
        "outline": sync_all_outlines,
    }

    def _on_task_done(task: asyncio.Task[None]) -> None:
        _background_tasks.discard(task)
        if task.cancelled():
            logger.warning("background_sync_cancelled")
        elif exc := task.exception():
            logger.error("background_sync_failed", exc=str(exc))

    def _launch(coro_fn: Callable[[], Coroutine[Any, Any, None]]) -> None:
        task = asyncio.create_task(coro_fn())
        _background_tasks.add(task)
        task.add_done_callback(_on_task_done)

    async def _sync_pipeline() -> None:
        """Run course discovery first, then dispatch remaining sync tasks."""
        await sync_all_courses()
        for fn in _SCOPE_DISPATCH.values():
            _launch(fn)

    if scope == "all":
        _launch(_sync_pipeline)
    elif scope in _SCOPE_DISPATCH:
        _launch(_SCOPE_DISPATCH[scope])

    return SuccessResponse(
        data=SyncTriggerResponse(
            message=f"Sync triggered successfully (scope={scope})",
            next_allowed_at=next_allowed_at.isoformat(),
        ),
        meta=get_request_meta(request),
    )


@router.get("/history")
async def get_sync_history(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    domain: str | None = None,
    limit: int = 20,
) -> SuccessResponse[SyncHistoryResponse]:
    """Return sync history entries for the current user."""
    from src.models.sync_history import SyncHistory

    stmt = select(SyncHistory).where(SyncHistory.user_id == current_user_id)
    if domain:
        stmt = stmt.where(SyncHistory.domain == domain)
    stmt = stmt.order_by(SyncHistory.started_at.desc()).limit(limit)

    result = await session.execute(stmt)
    entries = result.scalars().all()

    history_entries = [
        SyncHistoryEntry(
            id=str(e.id),
            domain=e.domain,
            status=e.status,
            records_updated=e.records_updated,
            error_message=e.error_message,
            started_at=e.started_at.isoformat() if e.started_at else "",
            completed_at=e.completed_at.isoformat() if e.completed_at else None,
        )
        for e in entries
    ]

    return SuccessResponse(
        data=SyncHistoryResponse(entries=history_entries),
        meta=get_request_meta(request),
    )


@router.get("/status")
async def get_sync_status(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[SyncStatusResponse]:
    """Return sync status matching OpenAPI SyncStatusResponse contract."""
    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

    # Determine overall sync status from per-platform statuses
    canvas_s = profile.canvas_sync_status
    ed_s = profile.ed_sync_status
    is_syncing = canvas_s == "syncing" or ed_s == "syncing"

    if is_syncing:
        overall_status = "in_progress"
    elif canvas_s == "failed" or ed_s == "failed":
        overall_status = "completed"
    else:
        overall_status = "completed"

    # Build sync results from recent sync_history entries
    from src.models.sync_history import SyncHistory

    results = SyncResults()
    if profile.last_sync_at:
        hist_stmt = (
            select(SyncHistory)
            .where(
                SyncHistory.user_id == current_user_id,
                SyncHistory.started_at >= profile.last_sync_at,
            )
            .order_by(SyncHistory.started_at.desc())
        )
        hist_result = await session.execute(hist_stmt)
        entries = hist_result.scalars().all()
        for entry in entries:
            count = SyncCount(synced=entry.records_updated, new=0, updated=entry.records_updated)
            if entry.domain == "grades":
                results.grades = count
            elif entry.domain == "deadlines":
                results.deadlines = count
            elif entry.domain == "discussions":
                results.discussions = count

    started_at = (profile.last_sync_at or profile.last_manual_sync_at or datetime.utcnow())  # noqa: DTZ003
    completed_at_val = None if is_syncing else datetime.utcnow().isoformat()  # noqa: DTZ003

    last_sync = SyncDetail(
        sync_id=f"sync_{current_user_id.hex[:8]}",
        status=overall_status,
        started_at=started_at.isoformat(),
        completed_at=completed_at_val,
        results=results,
    )

    # Build platform health
    def _platform_health(status: str, last_synced: datetime | None) -> PlatformHealth:
        if status in ("success", "pending"):
            health = "healthy"
        elif status in ("degraded", "syncing"):
            health = "degraded"
        else:
            health = "error"
        return PlatformHealth(
            status=health,
            last_success=(last_synced.isoformat() if last_synced else started_at.isoformat()),
        )

    platforms = PlatformStatus(
        canvas=_platform_health(canvas_s, profile.canvas_last_synced_at),
        ed=_platform_health(ed_s, profile.ed_last_synced_at),
    )

    return SuccessResponse(
        data=SyncStatusResponse(last_sync=last_sync, platforms=platforms),
        meta=get_request_meta(request),
    )
