"""User profile and platform token management endpoints."""

import uuid
from typing import Any

import httpx
import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import Profile
from src.schemas.common import NotFoundError, SuccessResponse, TokenInvalidError, ValidationError
from src.schemas.user import (
    TokenConfigRequest,
    TokenConfigResponse,
    TokenStatus,
    UserResponse,
    UserUpdateRequest,
)
from src.web.deps import get_current_user_id, get_encryption, get_request_meta, get_session

logger = structlog.get_logger()

router = APIRouter()

VALID_PLATFORMS = ("canvas", "ed")


def _build_user_response(profile: Profile) -> UserResponse:
    """Build UserResponse from Profile ORM model with token statuses.

    Phase 34 WR-03 fix: coerce legacy rows with NULL/unknown
    ``language_preference`` or ``gpa_scale`` values to the documented
    defaults (``"en"`` / ``"wam"``) so the tightened ``Literal`` fields on
    ``UserResponse`` never raise at response time. A backfill migration
    remains the preferred long-term fix; this keeps GETs working until then.
    """
    canvas_status: str = (
        "active" if profile.canvas_api_token_encrypted else "not_configured"
    )
    ed_status: str = "active" if profile.ed_api_token_encrypted else "not_configured"

    language_preference = profile.language_preference or "en"
    if language_preference not in ("en", "zh"):
        language_preference = "en"

    gpa_scale = profile.gpa_scale or "wam"
    if gpa_scale not in ("wam", "gpa_4"):
        gpa_scale = "wam"

    return UserResponse(
        id=str(profile.id),
        display_name=profile.display_name,
        gpa_target=profile.gpa_target,
        gpa_scale=gpa_scale,
        remaining_credit_points=profile.remaining_credit_points,
        language_preference=language_preference,
        tokens={
            "canvas": TokenStatus(status=canvas_status, platform="canvas"),
            "ed": TokenStatus(status=ed_status, platform="ed"),
        },
        created_at=profile.created_at,
    )


@router.get("/me")
async def get_profile(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UserResponse]:
    """Return the current user's profile with token statuses."""
    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")
    return SuccessResponse(
        data=_build_user_response(profile),
        meta=get_request_meta(request),
    )


@router.patch("/me")
async def update_profile(
    body: UserUpdateRequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UserResponse]:
    """Update user profile fields (PATCH semantics -- only non-None fields applied)."""
    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

    if body.display_name is not None:
        profile.display_name = body.display_name

    if body.gpa_target is not None:
        profile.gpa_target = body.gpa_target

    # Phase 34 WR-01 fix: Pydantic ``Literal`` validation rejects non-enum
    # values before the handler runs; no runtime check needed here.
    if body.gpa_scale is not None:
        profile.gpa_scale = body.gpa_scale

    if body.remaining_credit_points is not None:
        profile.remaining_credit_points = body.remaining_credit_points

    if body.language_preference is not None:
        profile.language_preference = body.language_preference

    await session.flush()

    return SuccessResponse(
        data=_build_user_response(profile),
        meta=get_request_meta(request),
    )


@router.put("/me/tokens/{platform}")
async def configure_token(
    platform: str,
    body: TokenConfigRequest,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[TokenConfigResponse]:
    """Validate and store an encrypted platform API token."""
    if platform not in VALID_PLATFORMS:
        raise ValidationError(
            detail=f"Invalid platform '{platform}'. Must be 'canvas' or 'ed'.",
        )

    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

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
                # Ed API: /api/user returns user info + enrolled courses
                # /api/courses returns 403 with Bearer token
                resp = await client.get(
                    f"{settings.ed_base_url}/user",
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
        profile.canvas_api_token_encrypted = encrypted_token
    else:
        profile.ed_api_token_encrypted = encrypted_token

    await session.flush()

    logger.info(
        "token.configured",
        platform=platform,
        courses_found=courses_found,
        user_id=str(current_user_id),
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
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[dict[str, str]]:
    """Remove a stored platform API token."""
    if platform not in VALID_PLATFORMS:
        raise ValidationError(
            detail=f"Invalid platform '{platform}'. Must be 'canvas' or 'ed'.",
        )

    profile = await session.get(Profile, current_user_id)
    if profile is None:
        raise NotFoundError("Profile")

    if platform == "canvas":
        profile.canvas_api_token_encrypted = None
    else:
        profile.ed_api_token_encrypted = None

    await session.flush()

    return SuccessResponse(
        data={"status": "removed", "platform": platform},
        meta=get_request_meta(request),
    )
