"""GPA/WAM REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import SuccessResponse
from src.schemas.gpa import (
    CourseDetailResponse,
    GPASummaryResponse,
    TargetPathResponse,
    TargetRequest,
    TrendResponse,
    WhatIfCreateRequest,
    WhatIfScenarioResponse,
)
from src.services.gpa import GPAService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def get_gpa_service(session: AsyncSession = Depends(get_session)) -> GPAService:
    """FastAPI dependency: create GPAService with current session."""
    return GPAService(session)


@router.get("/summary")
async def get_gpa_summary(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GPASummaryResponse]:
    """Return cumulative WAM/GPA with per-course overview."""
    result = await svc.get_summary(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/courses/{course_id}")
async def get_course_detail(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[CourseDetailResponse]:
    """Return single course detail with assessment breakdown."""
    result = await svc.get_course_detail(current_user_id, course_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.post("/what-if", status_code=201)
async def create_whatif(
    body: WhatIfCreateRequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[WhatIfScenarioResponse]:
    """Create and return a what-if GPA scenario."""
    result = await svc.simulate(current_user_id, body)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/what-if")
async def list_whatif(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[list[WhatIfScenarioResponse]]:
    """List all saved what-if scenarios for the current user."""
    result = await svc.list_scenarios(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.post("/target")
async def calculate_target(
    body: TargetRequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[TargetPathResponse]:
    """Calculate minimum scores needed per assessment to reach target WAM."""
    result = await svc.calculate_target_path(current_user_id, body)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/trend")
async def get_trend(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[TrendResponse]:
    """Return per-semester WAM/GPA trend data."""
    result = await svc.get_trend(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))
