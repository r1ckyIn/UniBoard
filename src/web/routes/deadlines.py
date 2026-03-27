"""Deadline REST endpoints with multi-dimensional filters."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import SuccessResponse
from src.schemas.deadline import (
    ConflictDay,
    ContractDeadlineResponse,
    DeadlineDetailResponse,
    DeadlineResponse,
)
from src.services.deadline import DeadlineService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def get_deadline_service(session: AsyncSession = Depends(get_session)) -> DeadlineService:
    """FastAPI dependency: create DeadlineService with current session."""
    return DeadlineService(session)


def _compute_status(deadline: DeadlineResponse) -> str:
    """Derive contract status from legacy deadline fields.

    Logic: completed > submitted > overdue > upcoming.
    """
    # Parse due_date for comparison
    try:
        due_dt = datetime.fromisoformat(deadline.due_date.replace("Z", "+00:00"))
    except ValueError:
        return "upcoming"

    now = datetime.now(UTC)
    due_aware = due_dt.replace(tzinfo=UTC) if due_dt.tzinfo is None else due_dt

    if deadline.urgency == "past_due" or due_aware < now:
        return "overdue"
    return "upcoming"


def _compute_days_remaining(due_date_str: str) -> int:
    """Compute days remaining from due_date ISO string."""
    try:
        due_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
    except ValueError:
        return 0

    now = datetime.now(UTC)
    due_aware = due_dt.replace(tzinfo=UTC) if due_dt.tzinfo is None else due_dt
    delta = due_aware - now
    return delta.days


def _to_contract_deadline(d: DeadlineResponse) -> ContractDeadlineResponse:
    """Convert legacy DeadlineResponse to contract-aligned ContractDeadlineResponse."""
    return ContractDeadlineResponse(
        id=d.id,
        title=d.title,
        due_date=d.due_date,
        source=d.source,
        weight=d.weight,
        status=_compute_status(d),
        days_remaining=_compute_days_remaining(d.due_date),
        course_code=d.course_code,
        course_name=d.course_name,
        is_confirmed=d.is_confirmed,
    )


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
) -> SuccessResponse[list[ContractDeadlineResponse]]:
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
    return SuccessResponse(
        data=[_to_contract_deadline(d) for d in result],
        meta=get_request_meta(request),
    )


@router.get("/upcoming")
async def get_upcoming_deadlines(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[list[ContractDeadlineResponse]]:
    """Return deadlines due within the next 7 days."""
    now = datetime.now(UTC)
    result = await svc.get_deadlines(
        current_user_id,
        from_date=now,
        to_date=now + timedelta(days=7),
        include_past=False,
    )
    return SuccessResponse(
        data=[_to_contract_deadline(d) for d in result],
        meta=get_request_meta(request),
    )


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
