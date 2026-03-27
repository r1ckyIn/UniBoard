"""Sync trigger, status, and history REST endpoints."""

import asyncio
import uuid
from collections.abc import Callable, Coroutine
from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Profile
from src.schemas.common import NotFoundError, RateLimitedError, SuccessResponse
from src.schemas.sync import (
    SyncHistoryEntry,
    SyncHistoryResponse,
    SyncSourceStatus,
    SyncStatusResponse,
    SyncTriggerResponse,
)
from src.web.deps import get_current_user_id, get_request_meta, get_session

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

    # Update throttle timestamp
    profile.last_manual_sync_at = now
    await session.flush()

    scope = body.scope if body else "all"
    next_allowed_at = now + _SYNC_COOLDOWN

    # Dispatch actual sync task in background based on scope
    from src.sync.tasks import (
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

    def _launch(coro_fn: Callable[[], Coroutine[Any, Any, None]]) -> None:
        task = asyncio.create_task(coro_fn())
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    if scope == "all":
        for fn in _SCOPE_DISPATCH.values():
            _launch(fn)
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
    """Return per-source sync status for the current user."""
    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

    canvas_status = SyncSourceStatus(
        platform="canvas",
        status=profile.canvas_sync_status,
        last_synced_at=(
            profile.canvas_last_synced_at.isoformat()
            if profile.canvas_last_synced_at
            else None
        ),
        token_status=profile.canvas_token_status,
    )
    ed_status = SyncSourceStatus(
        platform="ed",
        status=profile.ed_sync_status,
        last_synced_at=(
            profile.ed_last_synced_at.isoformat()
            if profile.ed_last_synced_at
            else None
        ),
        token_status=profile.ed_token_status,
    )

    is_syncing = profile.canvas_sync_status == "syncing" or (
        profile.ed_sync_status == "syncing"
    )

    return SuccessResponse(
        data=SyncStatusResponse(
            sources=[canvas_status, ed_status],
            is_syncing=is_syncing,
        ),
        meta=get_request_meta(request),
    )
