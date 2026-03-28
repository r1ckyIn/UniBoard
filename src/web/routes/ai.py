"""AI-powered course Q&A and review REST endpoints."""

import json
import logging
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from src.config import get_settings

logger = logging.getLogger(__name__)
from src.schemas.ai import QARequest, QAResponse, StreamingQARequest, UnitReviewResponse
from src.schemas.common import SuccessResponse
from src.services.ai_engine import AIEngine
from src.services.qa import QAService
from src.web.deps import get_current_user_id, get_request_meta, get_session

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
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[QAResponse]:
    """Ask a question about course materials with AI-powered citation."""
    svc = _build_qa_service(session)
    result = await svc.answer_question(
        user_id=current_user_id,
        course_id=course_id,
        question=body.question,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/courses/{course_id}/review")
async def course_review(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UnitReviewResponse]:
    """Generate an AI-powered unit review summary for a course."""
    svc = _build_qa_service(session)
    result = await svc.generate_review(
        user_id=current_user_id,
        course_id=course_id,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.post("/courses/{course_id}/qa/stream")
async def course_qa_stream(
    course_id: uuid.UUID,
    body: StreamingQARequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """Stream AI Q&A response via SSE."""
    svc = _build_qa_service(session)

    async def event_generator():  # type: ignore[no-untyped-def]
        yield {"event": "status", "data": json.dumps({"phase": "searching"})}

        try:
            async for token in svc.stream_answer_question(
                user_id=current_user_id,
                course_id=course_id,
                question=body.question,
                history=body.history,
                search_more=body.search_more,
                language=body.language,
            ):
                yield {"event": "token", "data": json.dumps({"text": token})}

            yield {"event": "done", "data": json.dumps({"status": "complete"})}
        except Exception as exc:
            logger.exception("SSE stream error: %s", exc)
            yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}

    return EventSourceResponse(event_generator(), ping=15)


@router.get("/courses/{course_id}/review/stream")
async def course_review_stream(
    course_id: uuid.UUID,
    lang: str = "en",
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """Stream AI unit review as SSE markdown tokens."""
    svc = _build_qa_service(session)

    async def event_generator():  # type: ignore[no-untyped-def]
        yield {"event": "status", "data": json.dumps({"phase": "analyzing"})}

        try:
            async for token in svc.stream_review(
                user_id=current_user_id,
                course_id=course_id,
                language=lang,
            ):
                yield {"event": "token", "data": json.dumps({"text": token})}

            yield {"event": "done", "data": json.dumps({"status": "complete"})}
        except Exception as exc:
            logger.exception("SSE stream error: %s", exc)
            yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}

    return EventSourceResponse(event_generator(), ping=15)
