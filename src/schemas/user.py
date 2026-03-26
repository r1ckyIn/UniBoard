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
    """User profile response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    gpa_target: float | None
    gpa_scale: str
    tokens: dict[str, TokenStatus]
    created_at: datetime


class UserUpdateRequest(BaseModel):
    """PATCH /users/me request body -- all fields optional."""

    model_config = ConfigDict(strict=True)

    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    gpa_target: float | None = None
    gpa_scale: str | None = None


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
