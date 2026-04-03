"""AI-powered course Q&A and review REST endpoints."""

import json
import uuid
from collections.abc import AsyncGenerator

import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from src.config import get_settings
from src.models.course import Course
from src.models.user import Profile
from src.schemas.ai import QARequest, QAResponse, StreamingQARequest, UnitReviewResponse
from src.schemas.common import SuccessResponse
from src.security.encryption import TokenEncryption
from src.services.ai_engine import AIEngine
from src.services.qa import QAService
from src.services.skill import SkillService
from src.services.tool_executor import ToolExecutor
from src.web.deps import get_current_user_id, get_encryption, get_request_meta, get_session

logger = structlog.get_logger()

router = APIRouter()


async def _build_tool_executor(
    session: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    encryption: TokenEncryption,
) -> ToolExecutor | None:
    """Build ToolExecutor with user's decrypted tokens for a specific course."""
    # Fetch profile for tokens
    profile_result = await session.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return None

    # Fetch course for platform IDs
    course_result = await session.execute(
        select(Course).where(Course.id == course_id, Course.user_id == user_id)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        return None

    # Decrypt tokens (None if not configured)
    canvas_token = (
        encryption.decrypt(profile.canvas_api_token_encrypted)
        if profile.canvas_api_token_encrypted
        else None
    )
    ed_token = (
        encryption.decrypt(profile.ed_api_token_encrypted)
        if profile.ed_api_token_encrypted
        else None
    )

    return ToolExecutor(canvas_token=canvas_token, ed_token=ed_token, course=course)


def _build_qa_service(
    session: AsyncSession,
    tool_executor: ToolExecutor | None = None,
    skill_service: SkillService | None = None,
) -> QAService:
    """Build QAService with real AIEngine from settings."""
    settings = get_settings()
    engine = AIEngine(api_key=settings.anthropic_api_key)
    return QAService(
        session=session,
        ai_engine=engine,
        voyage_api_key=settings.voyage_api_key,
        tool_executor=tool_executor,
        skill_service=skill_service,
    )


async def _sse_wrap(
    stream: AsyncGenerator[str, None],
    initial_phase: str,
) -> AsyncGenerator[dict[str, str], None]:
    """Wrap an async token stream into SSE event dicts with error handling."""
    yield {"event": "status", "data": json.dumps({"phase": initial_phase})}

    try:
        async for token in stream:
            yield {"event": "token", "data": json.dumps({"text": token})}

        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    except Exception as exc:
        logger.exception("sse_stream_error", error=str(exc))
        yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}


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
    encryption = get_encryption()
    tool_executor = await _build_tool_executor(
        session, current_user_id, course_id, encryption
    )
    skill_service = SkillService(session)
    svc = _build_qa_service(session, tool_executor=tool_executor, skill_service=skill_service)

    async def _stream_with_cleanup() -> AsyncGenerator[dict[str, str], None]:
        try:
            stream = svc.stream_answer_question(
                user_id=current_user_id,
                course_id=course_id,
                question=body.question,
                history=body.history,
                search_more=body.search_more,
                language=body.language,
            )
            async for event in _sse_wrap(stream, "searching"):
                yield event
        finally:
            if tool_executor:
                await tool_executor.close()

    return EventSourceResponse(_stream_with_cleanup(), ping=15)


@router.get("/courses/{course_id}/review/stream")
async def course_review_stream(
    course_id: uuid.UUID,
    lang: str = "en",
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """Stream AI unit review as SSE markdown tokens."""
    skill_service = SkillService(session)
    svc = _build_qa_service(session, skill_service=skill_service)
    stream = svc.stream_review(
        user_id=current_user_id,
        course_id=course_id,
        language=lang,
    )
    return EventSourceResponse(_sse_wrap(stream, "analyzing"), ping=15)
