"""Ed Discussion intelligence REST endpoints."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import User
from src.schemas.common import SuccessResponse
from src.schemas.intelligence import AIHighValuePostResponse, HighValuePostResponse
from src.services.ai_engine import AIEngine
from src.services.intelligence import EdIntelligenceService
from src.web.deps import get_current_user, get_request_meta, get_session

router = APIRouter()


def get_intelligence_service(
    session: AsyncSession = Depends(get_session),
) -> EdIntelligenceService:
    """FastAPI dependency: create EdIntelligenceService with current session."""
    return EdIntelligenceService(session)


def _build_ai_engine() -> AIEngine | None:
    """Build AIEngine from settings, or None if no API key configured."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    return AIEngine(api_key=settings.anthropic_api_key)


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


@router.get("/courses/{course_id}/intelligence/ai")
async def get_ai_high_value_posts(
    course_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: EdIntelligenceService = Depends(get_intelligence_service),
) -> SuccessResponse[list[AIHighValuePostResponse]]:
    """Return AI-scored high-value Ed Discussion posts for a course.

    Evaluates unscored threads via AI, then returns all posts above threshold.
    Falls back to rule-based filtering if no API key configured.
    """
    ai_engine = _build_ai_engine()

    if ai_engine is not None:
        # Score new threads and return AI-enhanced results
        await svc.evaluate_new_threads_ai(current_user.id, course_id, ai_engine)
        results = await svc.get_ai_high_value_posts(current_user.id, course_id)
    else:
        # Fallback: convert rule-based posts to AI format with defaults
        rule_posts = await svc.get_high_value_posts(current_user.id, course_id)
        results = [
            AIHighValuePostResponse(
                id=p.id,
                ed_thread_id=p.ed_thread_id,
                title=p.title,
                category=p.category,
                content_summary=p.content_summary,
                is_endorsed=p.is_endorsed,
                is_staff_post=p.is_staff_post,
                created_at=p.created_at,
                gpa_relevance=0.5 if p.is_endorsed else 0.3,
                ai_category=p.category,
                ai_summary=p.content_summary[:100],
                urgency="informational",
                key_facts=[],
            )
            for p in rule_posts
        ]

    return SuccessResponse(data=results, meta=get_request_meta(request))
