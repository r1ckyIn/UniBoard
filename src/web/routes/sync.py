"""Sync trigger and status REST endpoints."""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Profile
from src.schemas.common import NotFoundError, RateLimitedError, SuccessResponse
from src.schemas.sync import SyncSourceStatus, SyncStatusResponse, SyncTriggerResponse
from src.web.deps import get_current_user_id, get_request_meta, get_session

# Manual sync cooldown period
_SYNC_COOLDOWN = timedelta(minutes=5)

router = APIRouter()


@router.post("/trigger")
async def trigger_sync(
    request: Request,
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
