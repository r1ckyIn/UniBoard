"""Ed Discussion intelligence REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.common import SuccessResponse
from src.schemas.intelligence import HighValuePostResponse
from src.services.intelligence import EdIntelligenceService
from src.web.deps import get_current_user, get_request_meta, get_session

router = APIRouter()


def get_intelligence_service(
    session: AsyncSession = Depends(get_session),
) -> EdIntelligenceService:
    """FastAPI dependency: create EdIntelligenceService with current session."""
    return EdIntelligenceService(session)


@router.get("/courses/{course_id}/discussions")
async def get_high_value_posts(
    course_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: EdIntelligenceService = Depends(get_intelligence_service),
) -> SuccessResponse[list[HighValuePostResponse]]:
    """Return endorsed and staff-answered Ed Discussion posts for a course."""
    result = await svc.get_high_value_posts(current_user.id, course_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))
