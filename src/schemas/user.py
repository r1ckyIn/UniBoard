"""User profile Pydantic v2 schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TokenStatus(BaseModel):
    """Status of a platform API token (canvas or ed)."""

    model_config = ConfigDict(from_attributes=True)

    status: Literal["active", "invalid", "not_configured"]
    platform: str


class UserResponse(BaseModel):
    """User profile response payload.

    Phase 34 WR-01 fix: ``language_preference`` is constrained to the
    ``Literal["en", "zh"]`` enum published by the OpenAPI contract so any
    corrupted DB row that somehow slipped past the PATCH validator raises
    a 500 instead of silently leaking a non-enum value to the frontend.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    gpa_target: float | None
    gpa_scale: Literal["wam", "gpa_4"] = "wam"
    remaining_credit_points: int | None = None
    language_preference: Literal["en", "zh"] = "en"
    tokens: dict[str, TokenStatus]
    created_at: datetime


class UserUpdateRequest(BaseModel):
    """PATCH /users/me request body -- all fields optional.

    Phase 34 WR-01 fix: ``language_preference`` and ``gpa_scale`` are
    restricted to their OpenAPI enums so Pydantic rejects malformed input
    at parse time, removing the need for the legacy manual ValidationError
    branches in the route handler.
    """

    model_config = ConfigDict(strict=True)

    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    gpa_target: float | None = None
    gpa_scale: Literal["wam", "gpa_4"] | None = None
    remaining_credit_points: int | None = Field(default=None, ge=0, le=500)
    language_preference: Literal["en", "zh"] | None = None


class TokenConfigRequest(BaseModel):
    """PUT /users/me/tokens/{platform} request body."""

    model_config = ConfigDict(strict=True)

    token: str = Field(min_length=1)


class TokenConfigResponse(BaseModel):
    """Token configuration success response payload."""

    model_config = ConfigDict(from_attributes=True)

    status: str
    platform: str
    courses_found: int
