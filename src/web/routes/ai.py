"""AI-powered course Q&A and review REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import User
from src.schemas.ai import QARequest, QAResponse, UnitReviewResponse
from src.schemas.common import SuccessResponse
from src.services.ai_engine import AIEngine
from src.services.qa import QAService
from src.web.deps import get_current_user, get_request_meta, get_session

router = APIRouter()


def _build_qa_service(session: AsyncSession) -> QAService:
    """Build QAService with real AIEngine from settings."""
    settings = get_settings()
    engine = AIEngine(api_key=settings.anthropic_api_key)
    return QAService(
        session=session,
        ai_engine=engine,
        voyage_api_key=settings.voyage_api_key,
    )


@router.post("/courses/{course_id}/qa")
async def course_qa(
    course_id: uuid.UUID,
    body: QARequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[QAResponse]:
    """Ask a question about course materials with AI-powered citation."""
    svc = _build_qa_service(session)
    result = await svc.answer_question(
        user_id=current_user.id,
        course_id=course_id,
        question=body.question,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/courses/{course_id}/review")
async def course_review(
    course_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UnitReviewResponse]:
    """Generate an AI-powered unit review summary for a course."""
    svc = _build_qa_service(session)
    result = await svc.generate_review(
        user_id=current_user.id,
        course_id=course_id,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))
