"""Digest REST endpoints."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import User
from src.schemas.common import NotFoundError, SuccessResponse
from src.schemas.digest import DigestResponse
from src.services.digest import DigestService
from src.web.deps import get_current_user, get_request_meta, get_session

router = APIRouter()


def get_digest_service(
    session: AsyncSession = Depends(get_session),
) -> DigestService:
    """FastAPI dependency: create DigestService with current session."""
    settings = get_settings()
    return DigestService(session, anthropic_api_key=settings.anthropic_api_key)


@router.get("/latest")
async def get_latest_digest(
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: DigestService = Depends(get_digest_service),
) -> SuccessResponse[DigestResponse]:
    """Return the most recent digest for the current user."""
    result = await svc.get_latest(current_user.id)
    if result is None:
        raise NotFoundError("Digest")
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/history")
async def get_digest_history(
    request: Request,
    limit: int = 7,
    current_user: User = Depends(get_current_user),
    svc: DigestService = Depends(get_digest_service),
) -> SuccessResponse[list[DigestResponse]]:
    """Return last N digests for the current user."""
    result = await svc.get_history(current_user.id, limit=limit)
    return SuccessResponse(data=result, meta=get_request_meta(request))
