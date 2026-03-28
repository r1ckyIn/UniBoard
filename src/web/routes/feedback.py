"""Feedback REST endpoints for AI evaluation quality gate."""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ai_feedback import AIFeedback
from src.schemas.common import SuccessResponse
from src.schemas.feedback import FeedbackRequest, FeedbackResponse
from src.services.quality_gate import FEEDBACK_THRESHOLD, QualityGateService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


@router.post("/threads/{thread_id}/feedback")
async def submit_feedback(
    thread_id: uuid.UUID,
    body: FeedbackRequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[FeedbackResponse]:
    """Submit thumbs_up or thumbs_down feedback on an AI-scored thread.

    Uses UPSERT so users can change their vote without creating duplicates.
    After upsert, triggers quality gate check when feedback count >= 50.
    """
    # UPSERT: insert or update on conflict
    stmt = (
        pg_insert(AIFeedback)
        .values(
            user_id=current_user_id,
            thread_id=thread_id,
            feedback_type=body.feedback_type,
        )
        .on_conflict_do_update(
            constraint="uq_feedback_user_thread",
            set_={"feedback_type": body.feedback_type},
        )
        .returning(
            AIFeedback.id,
            AIFeedback.thread_id,
            AIFeedback.feedback_type,
            AIFeedback.created_at,
        )
    )
    result = await session.execute(stmt)
    row = result.one()

    # Check total feedback count and trigger quality gate if threshold met
    count_stmt = select(func.count()).select_from(AIFeedback)
    count_result = await session.execute(count_stmt)
    total = count_result.scalar_one()

    if total >= FEEDBACK_THRESHOLD:
        gate = QualityGateService(session)
        await gate.check_and_update_fallback()

    await session.flush()

    response = FeedbackResponse(
        id=str(row.id),
        thread_id=str(row.thread_id),
        feedback_type=row.feedback_type,
        created_at=row.created_at.isoformat(),
    )

    return SuccessResponse(data=response, meta=get_request_meta(request))
