"""User profile and platform token management endpoints."""

from typing import Any

import httpx
import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import User
from src.schemas.common import SuccessResponse, TokenInvalidError, ValidationError
from src.schemas.user import (
    TokenConfigRequest,
    TokenConfigResponse,
    TokenStatus,
    UserResponse,
    UserUpdateRequest,
)
from src.web.deps import get_current_user, get_encryption, get_request_meta, get_session

logger = structlog.get_logger()

router = APIRouter()

VALID_PLATFORMS = ("canvas", "ed")


def _build_user_response(user: User) -> UserResponse:
    """Build UserResponse from User ORM model with token statuses."""
    canvas_status: str = (
        "active" if user.canvas_api_token_encrypted else "not_configured"
    )
    ed_status: str = "active" if user.ed_api_token_encrypted else "not_configured"

    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        gpa_target=user.gpa_target,
        gpa_scale=user.gpa_scale,
        tokens={
            "canvas": TokenStatus(status=canvas_status, platform="canvas"),
            "ed": TokenStatus(status=ed_status, platform="ed"),
        },
        created_at=user.created_at,
    )


@router.get("/me")
async def get_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> SuccessResponse[UserResponse]:
    """Return the current user's profile with token statuses."""
    return SuccessResponse(
        data=_build_user_response(current_user),
        meta=get_request_meta(request),
    )


@router.patch("/me")
async def update_profile(
    body: UserUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UserResponse]:
    """Update user profile fields (PATCH semantics -- only non-None fields applied)."""
    if body.display_name is not None:
        current_user.display_name = body.display_name

    if body.gpa_target is not None:
        current_user.gpa_target = body.gpa_target

    if body.gpa_scale is not None:
        if body.gpa_scale not in ("wam", "gpa_4"):
            raise ValidationError(detail="gpa_scale must be 'wam' or 'gpa_4'")
        current_user.gpa_scale = body.gpa_scale

    await session.flush()

    return SuccessResponse(
        data=_build_user_response(current_user),
        meta=get_request_meta(request),
    )


@router.put("/me/tokens/{platform}")
async def configure_token(
    platform: str,
    body: TokenConfigRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[TokenConfigResponse]:
    """Validate and store an encrypted platform API token."""
    if platform not in VALID_PLATFORMS:
        raise ValidationError(
            detail=f"Invalid platform '{platform}'. Must be 'canvas' or 'ed'.",
        )

    settings = get_settings()
    courses_found = 0

    # Validate token against real API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if platform == "canvas":
                resp = await client.get(
                    f"{settings.canvas_base_url}/users/self",
                    headers={"Authorization": f"Bearer {body.token}"},
                )
                if resp.status_code != 200:
                    raise TokenInvalidError(platform=platform)
                # Get course count
                courses_resp = await client.get(
                    f"{settings.canvas_base_url}/courses",
                    headers={"Authorization": f"Bearer {body.token}"},
                    params={"enrollment_state": "active"},
                )
                if courses_resp.status_code == 200:
                    courses_data: Any = courses_resp.json()
                    if isinstance(courses_data, list):
                        courses_found = len(courses_data)

            elif platform == "ed":
                resp = await client.get(
                    f"{settings.ed_base_url}/courses",
                    headers={"Authorization": f"Bearer {body.token}"},
                )
                if resp.status_code != 200:
                    raise TokenInvalidError(platform=platform)
                courses_data = resp.json()
                if isinstance(courses_data, dict):
                    course_list: Any = courses_data.get("courses", [])
                    if isinstance(course_list, list):
                        courses_found = len(course_list)
                elif isinstance(courses_data, list):
                    courses_found = len(courses_data)

    except httpx.HTTPError as exc:
        raise TokenInvalidError(platform=platform) from exc

    # Encrypt and store
    encryption = get_encryption()
    encrypted_token = encryption.encrypt(body.token)

    if platform == "canvas":
        current_user.canvas_api_token_encrypted = encrypted_token
    else:
        current_user.ed_api_token_encrypted = encrypted_token

    await session.flush()

    logger.info(
        "token.configured",
        platform=platform,
        courses_found=courses_found,
        user_id=str(current_user.id),
    )

    return SuccessResponse(
        data=TokenConfigResponse(
            status="active",
            platform=platform,
            courses_found=courses_found,
        ),
        meta=get_request_meta(request),
    )


@router.delete("/me/tokens/{platform}")
async def remove_token(
    platform: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[dict[str, str]]:
    """Remove a stored platform API token."""
    if platform not in VALID_PLATFORMS:
        raise ValidationError(
            detail=f"Invalid platform '{platform}'. Must be 'canvas' or 'ed'.",
        )

    if platform == "canvas":
        current_user.canvas_api_token_encrypted = None
    else:
        current_user.ed_api_token_encrypted = None

    await session.flush()

    return SuccessResponse(
        data={"status": "removed", "platform": platform},
        meta=get_request_meta(request),
    )
