"""REST endpoint for Assignment ROI analysis."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import SuccessResponse
from src.schemas.roi import CourseROIResponse
from src.services.roi import ROIService
from src.web.deps import get_current_user_id, get_request_meta, get_session
from src.web.rate_limit import limiter

router = APIRouter()


def get_roi_service(session: AsyncSession = Depends(get_session)) -> ROIService:
    """FastAPI dependency: create ROIService with current session."""
    return ROIService(session)


@router.get("/{course_id}/roi")
@limiter.limit("10/minute")
async def get_course_roi(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ROIService = Depends(get_roi_service),
) -> SuccessResponse[CourseROIResponse]:
    """Get assignment ROI analysis for a course.

    Returns assignments ranked by ROI (weight / difficulty).
    Higher ROI = more grade impact per unit of effort.
    """
    result = await svc.get_course_roi(current_user_id, course_id)
    meta = get_request_meta(request)
    return SuccessResponse(data=result, meta=meta)
