"""AI-powered course Q&A and review REST endpoints."""

import json
import uuid
from collections.abc import AsyncGenerator

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from src.config import get_settings
from src.models.course import Course
from src.models.user import Profile
from src.schemas.ai import QARequest, QAResponse, StreamingQARequest, UnitReviewResponse
from src.schemas.common import RateLimitedError, SuccessResponse
from src.schemas.study_recommendation import StudyRecommendationResponse
from src.security.encryption import TokenEncryption
from src.services.ai_engine import AIEngine
from src.services.qa import QAService
from src.services.skill import SkillService
from src.services.study_recommendation import StudyRecommendationService
from src.services.tool_executor import ToolExecutor
from src.web.deps import get_current_user_id, get_encryption, get_request_meta, get_session
from src.web.rate_limit import limiter

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


def _require_ai_configured() -> None:
    """Raise 503 if AI features are not configured."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI features are not configured. ANTHROPIC_API_KEY is required.",
        )


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
    sources: list[dict[str, object]] | None = None,
) -> AsyncGenerator[dict[str, str], None]:
    """Wrap an async token stream into SSE event dicts with error handling.

    Phase 34 AIFEAT-02 / RESEARCH §10 Pitfall 2: when ``sources`` is provided
    (non-empty), emit a ``sources`` event BEFORE the first ``token`` event so
    the frontend has the citation map ready when ``[1]`` arrives in the
    token stream. The event is omitted when ``sources`` is ``None`` or empty.
    """
    yield {"event": "status", "data": json.dumps({"phase": initial_phase})}

    if sources:
        yield {"event": "sources", "data": json.dumps({"sources": sources})}

    try:
        async for token in stream:
            yield {"event": "token", "data": json.dumps({"text": token})}

        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    except Exception as exc:
        logger.exception("sse_stream_error", error=str(exc))
        yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}


@router.post("/courses/{course_id}/qa")
@limiter.limit("10/minute")
async def course_qa(
    course_id: uuid.UUID,
    body: QARequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[QAResponse]:
    """Ask a question about course materials with AI-powered citation.

    Phase 34 MD-01 fix: propagates the user's ``language_preference`` so the
    non-streaming path matches the streaming path's bilingual behaviour.
    """
    _require_ai_configured()
    # Fetch the profile once to pick the correct QA system prompt (EN/ZH).
    profile_result = await session.execute(
        select(Profile).where(Profile.id == current_user_id)
    )
    profile = profile_result.scalar_one_or_none()
    language = (profile.language_preference or "en") if profile else "en"
    svc = _build_qa_service(session)
    result = await svc.answer_question(
        user_id=current_user_id,
        course_id=course_id,
        question=body.question,
        language=language,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/courses/{course_id}/review")
@limiter.limit("10/minute")
async def course_review(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UnitReviewResponse]:
    """Generate an AI-powered unit review summary for a course."""
    _require_ai_configured()
    svc = _build_qa_service(session)
    result = await svc.generate_review(
        user_id=current_user_id,
        course_id=course_id,
    )
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.post("/courses/{course_id}/qa/stream")
@limiter.limit("10/minute")
async def course_qa_stream(
    course_id: uuid.UUID,
    body: StreamingQARequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """Stream AI Q&A response via SSE.

    Phase 34 MD-03 fix: increment the AI daily-limit counter BEFORE the RAG
    sources prefetch so users cannot bypass the quota by driving
    ``retrieve_rag_sources`` (a Voyage embedding call) without ever yielding
    the stream. On 429, emit a structured SSE ``error`` event instead of an
    uncaught HTTPException so the frontend sees the standard SSE flow.
    """
    _require_ai_configured()
    encryption = get_encryption()
    tool_executor = await _build_tool_executor(
        session, current_user_id, course_id, encryption
    )
    skill_service = SkillService(session)
    svc = _build_qa_service(session, tool_executor=tool_executor, skill_service=skill_service)

    # Phase 34 MD-03 fix: gate all cost-bearing work behind the daily AI
    # limit check. Increment the counter up front; ``stream_answer_question``
    # is told ``already_counted=True`` to avoid a double increment.
    try:
        await svc.check_and_increment_limit(current_user_id)
    except RateLimitedError as exc:
        rate_limit_message = str(exc)

        async def _rate_limit_stream() -> AsyncGenerator[dict[str, str], None]:
            yield {
                "event": "error",
                "data": json.dumps(
                    {"message": rate_limit_message, "code": "rate_limited"}
                ),
            }

        if tool_executor:
            await tool_executor.close()
        return EventSourceResponse(_rate_limit_stream(), ping=15)

    # Phase 34 AIFEAT-02: pre-fetch RAG sources so the SSE 'sources' event
    # can be emitted BEFORE the first token (RESEARCH §10 Pitfall 2).
    # Returns None when the course context is small enough for direct-context
    # streaming (no RAG retrieval), or when voyageai is unavailable.
    sources_payload: list[dict[str, object]] | None = None
    try:
        sources_payload = await svc.retrieve_rag_sources(course_id, body.question)
    except Exception:
        logger.warning("rag_sources_prefetch_failed", exc_info=True)

    async def _stream_with_cleanup() -> AsyncGenerator[dict[str, str], None]:
        try:
            stream = svc.stream_answer_question(
                user_id=current_user_id,
                course_id=course_id,
                question=body.question,
                history=body.history,
                search_more=body.search_more,
                language=body.language,
                already_counted=True,  # route incremented counter above
            )
            async for event in _sse_wrap(stream, "searching", sources=sources_payload):
                yield event
        finally:
            if tool_executor:
                await tool_executor.close()

    return EventSourceResponse(_stream_with_cleanup(), ping=15)


@router.get("/courses/{course_id}/review/stream")
@limiter.limit("10/minute")
async def course_review_stream(
    course_id: uuid.UUID,
    request: Request,
    lang: str = "en",
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """Stream AI unit review as SSE markdown tokens."""
    _require_ai_configured()
    skill_service = SkillService(session)
    svc = _build_qa_service(session, skill_service=skill_service)
    stream = svc.stream_review(
        user_id=current_user_id,
        course_id=course_id,
        language=lang,
    )
    return EventSourceResponse(_sse_wrap(stream, "analyzing"), ping=15)


# ---------------------------------------------------------------------------
# Phase 34 AIFEAT-01 -- Daily study recommendation (D-A2, no realtime LLM)
# ---------------------------------------------------------------------------


def _build_study_rec_service(
    session: AsyncSession = Depends(get_session),
) -> StudyRecommendationService:
    """Dependency factory for StudyRecommendationService.

    Endpoint only reads the cached row; language was set at generation time
    by the APScheduler job using the user's Profile.language_preference.
    """
    settings = get_settings()
    return StudyRecommendationService(
        session,
        anthropic_api_key=settings.anthropic_api_key,
        language="en",
    )


@router.get("/ai/study-recommendations")
@limiter.limit("60/minute")
async def get_study_recommendations(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: StudyRecommendationService = Depends(_build_study_rec_service),
) -> SuccessResponse[StudyRecommendationResponse | None]:
    """Get cached daily study recommendations for the current user.

    Returns 200 + data=null if no recommendation has been generated yet
    (e.g., a new user before the first 07:00 AEST cycle). Frontend falls
    back to the defaultEncouragementProvider per D-D1.
    """
    result = await svc.get_latest(current_user_id)
    meta = get_request_meta(request)
    return SuccessResponse(data=result, meta=meta)
