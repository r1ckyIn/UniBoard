"""Ed Discussion intelligence REST endpoints.

AI evaluation is handled by background sync tasks (not inline).
This route reads pre-computed scores only.
"""

import uuid
from base64 import b64decode, b64encode
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.schemas.common import SuccessResponse
from src.schemas.intelligence import (
    AIHighValuePostResponse,
    DiscussionResponse,
    HighValuePostResponse,
)
from src.services.intelligence import EdIntelligenceService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def get_intelligence_service(
    session: AsyncSession = Depends(get_session),
) -> EdIntelligenceService:
    """FastAPI dependency: create EdIntelligenceService with current session."""
    return EdIntelligenceService(session)


def _derive_relevance_category(thread: HighValuePostResponse) -> str:
    """Derive relevance category from thread attributes."""
    if thread.is_endorsed:
        return "endorsed"
    if thread.is_staff_post:
        return "staff"
    return "community"


def _derive_gpa_relevance_score(thread: HighValuePostResponse) -> float:
    """Derive GPA relevance score from thread attributes."""
    if thread.is_endorsed:
        return 0.5
    if thread.is_staff_post:
        return 0.3
    return 0.0


def _to_discussion_response(thread: HighValuePostResponse) -> DiscussionResponse:
    """Convert legacy HighValuePostResponse to contract DiscussionResponse."""
    return DiscussionResponse(
        id=thread.id,
        ed_thread_id=thread.ed_thread_id,
        title=thread.title,
        author="Unknown",  # Legacy schema lacks author; service-level method provides it
        category=thread.category,
        is_endorsed=thread.is_endorsed,
        is_staff_post=thread.is_staff_post,
        gpa_relevance_score=_derive_gpa_relevance_score(thread),
        relevance_category=_derive_relevance_category(thread),
        summary=thread.content_summary,
        created_at=thread.created_at,
    )


def _encode_cursor(created_at: str) -> str:
    """Encode created_at as base64 cursor."""
    return b64encode(created_at.encode()).decode()


def _decode_cursor(cursor: str) -> str:
    """Decode base64 cursor to created_at string."""
    return b64decode(cursor.encode()).decode()


@router.get("/courses/{course_id}/discussions")
async def get_course_discussions(
    course_id: uuid.UUID,
    request: Request,
    filter: str = Query("high_value"),  # noqa: A002
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: EdIntelligenceService = Depends(get_intelligence_service),
) -> dict[str, Any]:
    """Return discussion threads with filter modes and cursor pagination.

    Filter modes: high_value (endorsed|staff), endorsed, staff, all.
    Pagination: cursor-based using created_at timestamps.
    """
    # Fetch discussions based on filter mode
    discussions = await svc.get_discussions(
        current_user_id,
        course_id,
        filter_mode=filter,
        cursor=_decode_cursor(cursor) if cursor else None,
        limit=limit + 1,  # Fetch one extra to determine has_more
    )

    # Determine pagination
    has_more = len(discussions) > limit
    page_items = discussions[:limit]

    # Build pagination info
    pagination = None
    if has_more or cursor:
        next_cursor = _encode_cursor(page_items[-1].created_at) if has_more and page_items else None
        pagination = {
            "next_cursor": next_cursor,
            "has_more": has_more,
        }

    meta = get_request_meta(request)
    result: dict[str, Any] = {
        "data": page_items,
        "meta": meta,
    }
    if pagination is not None:
        result["pagination"] = pagination
    return result


@router.get("/courses/{course_id}/intelligence/ai")
async def get_ai_high_value_posts(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: EdIntelligenceService = Depends(get_intelligence_service),
) -> SuccessResponse[list[AIHighValuePostResponse]]:
    """Return pre-computed AI-scored high-value Ed Discussion posts.

    Reads scores computed by background sync tasks. No inline AI evaluation.
    Falls back to rule-based filtering if no API key configured and no
    pre-computed scores exist.
    """
    settings = get_settings()

    # Read pre-computed AI scores (populated by sync_ed_discussions post-sync hook)
    results = await svc.get_ai_high_value_posts(current_user_id, course_id)

    # Fallback: if no AI key configured and no results, use rule-based
    if not results and not settings.anthropic_api_key:
        rule_posts = await svc.get_high_value_posts(current_user_id, course_id)
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
