"""Deadline REST endpoints with multi-dimensional filters."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import SuccessResponse
from src.schemas.deadline import ConflictDay, DeadlineDetailResponse, DeadlineResponse
from src.services.deadline import DeadlineService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def get_deadline_service(session: AsyncSession = Depends(get_session)) -> DeadlineService:
    """FastAPI dependency: create DeadlineService with current session."""
    return DeadlineService(session)


@router.get("")
async def list_deadlines(
    request: Request,
    course_code: str | None = Query(None),
    urgency: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    include_past: bool = Query(False),
    sort: str = Query("due_date"),
    order: str = Query("asc"),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[list[DeadlineResponse]]:
    """Return filtered, urgency-graded deadline list."""
    result = await svc.get_deadlines(
        current_user_id,
        course_code=course_code,
        urgency=urgency,
        from_date=from_date,
        to_date=to_date,
        include_past=include_past,
        sort=sort,
        order=order,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/conflicts")
async def get_conflicts(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[list[ConflictDay]]:
    """Return dates with 2+ deadlines (conflicts)."""
    result = await svc.get_conflicts(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/{deadline_id}")
async def get_deadline(
    deadline_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[DeadlineDetailResponse]:
    """Return single deadline detail with dedup metadata."""
    result = await svc.get_deadline(current_user_id, deadline_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))
