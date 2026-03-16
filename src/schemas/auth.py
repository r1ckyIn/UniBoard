"""Auth request/response Pydantic v2 schemas."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Registration request with email, password, and display name."""

    model_config = ConfigDict(strict=True)

    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=100)


class RegisterResponse(BaseModel):
    """Registration success response payload."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    email: str
    display_name: str


class LoginResponse(BaseModel):
    """Login / refresh success response payload."""

    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """Refresh token request body."""

    model_config = ConfigDict(strict=True)

    refresh_token: str
