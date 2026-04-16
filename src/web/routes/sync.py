"""Sync trigger, status, and history REST endpoints."""

import asyncio
import uuid
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime, timedelta
from typing import Any, Final, Literal

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Profile
from src.schemas.common import NotFoundError, RateLimitedError, SuccessResponse
from src.schemas.sync import (
    CanvasPlatformCounts,
    EdPlatformCounts,
    PerPlatformCounts,
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

# Limit concurrent sync tasks to prevent DB pool exhaustion
_SYNC_SEMAPHORE: Final = asyncio.Semaphore(2)

router = APIRouter()


# Single source of truth for domain->platform grouping on the sync status
# endpoint. Extend this map when new sync domains are added; the response
# shape does not change for existing consumers.
DOMAIN_TO_PLATFORM: Final[dict[str, str]] = {
    "grades": "canvas",
    "deadlines": "canvas",
    "discussions": "ed",
}


def aggregate_per_platform_counts(
    results: SyncResults | None,
) -> PerPlatformCounts | None:
    """Group SyncResults domain counters by their source platform.

    Returns None when `results` is None (no sync has happened yet),
    matching last_sync=None semantics. Missing domain counters default
    to zero so the canvas/ed shape is always fully populated.
    """
    if results is None:
        return None

    grades = results.grades.synced if results.grades is not None else 0
    deadlines = results.deadlines.synced if results.deadlines is not None else 0
    discussions = results.discussions.synced if results.discussions is not None else 0

    return PerPlatformCounts(
        canvas=CanvasPlatformCounts(
            grades=grades,
            deadlines=deadlines,
            total=grades + deadlines,
        ),
        ed=EdPlatformCounts(
            discussions=discussions,
            total=discussions,
        ),
    )


_ValidScope = Literal["all", "grades", "deadlines", "modules", "outline"]
_ValidPlatform = Literal["canvas", "ed"]

# Map platform -> sync scopes belonging to that platform. Used by the
# onboarding "Retry failed only" UX (plan 33-07) to re-trigger sync for
# a specific failed adapter instead of running the full pipeline.
_PLATFORM_TO_SCOPES: Final[dict[str, list[str]]] = {
    "canvas": ["grades", "deadlines", "modules", "outline"],
    "ed": ["discussions"],
}

# Module-level set to hold strong references to background sync tasks,
# preventing garbage collection mid-execution.
_background_tasks: set[asyncio.Task[None]] = set()


class SyncTriggerRequest(BaseModel):
    """Optional request body for manual sync trigger.

    `scope` selects a single sync domain (or "all" for the full pipeline).
    `platforms` is an optional override that limits dispatch to scopes
    belonging to the listed platforms — used by the onboarding
    SuccessStep "Retry failed only" button. When `platforms` is set,
    `scope` is ignored.
    """

    scope: _ValidScope = "all"
    platforms: list[_ValidPlatform] | None = None


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

    now = datetime.now(UTC)

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
    platforms_filter = body.platforms if body else None
    next_allowed_at = now + _SYNC_COOLDOWN

    # Dispatch actual sync task in background based on scope.
    # Course discovery runs first so other tasks find Course records.
    from src.sync import (
        sync_all_courses,
        sync_all_deadlines,
        sync_all_grades,
        sync_all_modules,
        sync_all_outlines,
        sync_ed_discussions,
    )

    _SCOPE_DISPATCH: dict[str, Callable[[], Coroutine[Any, Any, None]]] = {
        "grades": sync_all_grades,
        "deadlines": sync_all_deadlines,
        "modules": sync_all_modules,
        "outline": sync_all_outlines,
        "discussions": sync_ed_discussions,
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
        """Run course discovery first, then dispatch remaining sync tasks.

        Uses a semaphore to limit concurrent sync tasks and prevent
        database connection pool exhaustion on Supavisor.
        """
        await sync_all_courses()

        async def _limited(fn: Callable[[], Coroutine[Any, Any, None]]) -> None:
            async with _SYNC_SEMAPHORE:
                await fn()

        for fn in _SCOPE_DISPATCH.values():
            bound_fn = fn  # capture loop variable

            async def _run(f: Callable[[], Coroutine[Any, Any, None]] = bound_fn) -> None:
                await _limited(f)

            _launch(_run)

    # Platform filter takes precedence over scope (used by onboarding
    # "Retry failed only" UX in plan 33-07). When platforms are listed,
    # only the scopes belonging to those platforms are dispatched.
    if platforms_filter is not None and len(platforms_filter) > 0:
        for platform in platforms_filter:
            for scope_name in _PLATFORM_TO_SCOPES.get(platform, []):
                fn = _SCOPE_DISPATCH.get(scope_name)
                if fn is not None:
                    _launch(fn)
        message = (
            f"Sync triggered successfully (platforms={','.join(platforms_filter)})"
        )
    elif scope == "all":
        _launch(_sync_pipeline)
        message = "Sync triggered successfully (scope=all)"
    elif scope in _SCOPE_DISPATCH:
        _launch(_SCOPE_DISPATCH[scope])
        message = f"Sync triggered successfully (scope={scope})"
    else:
        message = f"Sync triggered successfully (scope={scope})"

    return SuccessResponse(
        data=SyncTriggerResponse(
            message=message,
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

    started_at = (profile.last_sync_at or profile.last_manual_sync_at or datetime.now(UTC))
    completed_at_val = None if is_syncing else datetime.now(UTC).isoformat()

    last_sync = SyncDetail(
        sync_id=f"sync_{current_user_id.hex[:8]}",
        status=overall_status,
        started_at=started_at.isoformat(),
        completed_at=completed_at_val,
        results=results,
    )

    # Group domain counters under their source platform for onboarding UX
    # (plan 33-07 consumes this). None signals "no sync has happened yet".
    per_platform_counts = (
        aggregate_per_platform_counts(results) if profile.last_sync_at else None
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
        data=SyncStatusResponse(
            last_sync=last_sync,
            per_platform_counts=per_platform_counts,
            platforms=platforms,
        ),
        meta=get_request_meta(request),
    )
