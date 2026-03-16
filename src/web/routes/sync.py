"""Sync trigger and status REST endpoints."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.common import RateLimitedError, SuccessResponse
from src.schemas.sync import SyncSourceStatus, SyncStatusResponse, SyncTriggerResponse
from src.web.deps import get_current_user, get_request_meta, get_session

# Manual sync cooldown period
_SYNC_COOLDOWN = timedelta(minutes=5)

router = APIRouter()


@router.post("/trigger")
async def trigger_sync(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[SyncTriggerResponse]:
    """Trigger a manual sync for the current user (throttled to 1 per 5 minutes)."""
    now = datetime.utcnow()  # noqa: DTZ003 -- naive UTC for PostgreSQL TIMESTAMP

    # Check throttle
    if current_user.last_manual_sync_at is not None:
        last = current_user.last_manual_sync_at
        if now - last < _SYNC_COOLDOWN:
            next_allowed = last + _SYNC_COOLDOWN
            raise RateLimitedError(
                f"Manual sync rate limited. Next allowed at {next_allowed.isoformat()}"
            )

    # Update throttle timestamp
    current_user.last_manual_sync_at = now
    await session.flush()

    next_allowed_at = now + _SYNC_COOLDOWN

    return SuccessResponse(
        data=SyncTriggerResponse(
            message="Sync triggered successfully",
            next_allowed_at=next_allowed_at.isoformat(),
        ),
        meta=get_request_meta(request),
    )


@router.get("/status")
async def get_sync_status(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> SuccessResponse[SyncStatusResponse]:
    """Return per-source sync status for the current user."""
    canvas_status = SyncSourceStatus(
        platform="canvas",
        status=current_user.canvas_sync_status,
        last_synced_at=(
            current_user.canvas_last_synced_at.isoformat()
            if current_user.canvas_last_synced_at
            else None
        ),
        token_status=current_user.canvas_token_status,
    )
    ed_status = SyncSourceStatus(
        platform="ed",
        status=current_user.ed_sync_status,
        last_synced_at=(
            current_user.ed_last_synced_at.isoformat()
            if current_user.ed_last_synced_at
            else None
        ),
        token_status=current_user.ed_token_status,
    )

    is_syncing = current_user.canvas_sync_status == "syncing" or (
        current_user.ed_sync_status == "syncing"
    )

    return SuccessResponse(
        data=SyncStatusResponse(
            sources=[canvas_status, ed_status],
            is_syncing=is_syncing,
        ),
        meta=get_request_meta(request),
    )
