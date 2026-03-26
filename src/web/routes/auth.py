"""Auth endpoints: Supabase JWT-based authentication.

Supabase Auth handles register, login, and token refresh.
This module provides a /me endpoint that returns the current user's profile.
"""

import uuid

import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Profile
from src.schemas.common import NotFoundError, SuccessResponse
from src.schemas.user import TokenStatus, UserResponse
from src.web.deps import get_current_user_id, get_request_meta, get_session

logger = structlog.get_logger()

router = APIRouter()


@router.get("/me")
async def get_me(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UserResponse]:
    """Return the current authenticated user's profile.

    Validates the Supabase JWT and fetches the corresponding profile from DB.
    """
    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

    canvas_status: str = (
        "active" if profile.canvas_api_token_encrypted else "not_configured"
    )
    ed_status: str = "active" if profile.ed_api_token_encrypted else "not_configured"

    data = UserResponse(
        id=str(profile.id),
        display_name=profile.display_name,
        gpa_target=profile.gpa_target,
        gpa_scale=profile.gpa_scale,
        tokens={
            "canvas": TokenStatus(status=canvas_status, platform="canvas"),
            "ed": TokenStatus(status=ed_status, platform="ed"),
        },
        created_at=profile.created_at,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))
