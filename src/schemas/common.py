"""Unified API response envelope, error models, and exception hierarchy."""

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class MetaInfo(BaseModel):
    """Metadata included with every API response."""

    model_config = ConfigDict(from_attributes=True)

    request_id: str
    timestamp: datetime


class SuccessResponse(BaseModel, Generic[T]):  # noqa: UP046
    """Unified success response wrapper."""

    model_config = ConfigDict(from_attributes=True)

    data: T
    meta: MetaInfo


class PaginationMeta(BaseModel):
    """Pagination metadata for list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    cursor: str | None = None
    limit: int
    has_more: bool


class ErrorDetail(BaseModel):
    """Structured error detail within an error response."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    message: str
    details: Any = None


class ErrorResponse(BaseModel):
    """Unified error response wrapper."""

    model_config = ConfigDict(from_attributes=True)

    error: ErrorDetail
    meta: MetaInfo


# --- Exception Hierarchy (TRD SS14.1-14.2) ---


class UniboardError(Exception):
    """Base exception for all UniBoard application errors."""

    def __init__(
        self,
        code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred",
        status_code: int = 500,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class TokenInvalidError(UniboardError):
    """Raised when a platform API token is invalid or expired."""

    def __init__(self, platform: str) -> None:
        super().__init__(
            code="TOKEN_INVALID",
            message=f"{platform} API token is invalid or expired",
            status_code=422,
        )
        self.platform = platform


class UpstreamAPIError(UniboardError):
    """Raised when an upstream API (Canvas/Ed) returns an error."""

    def __init__(self, platform: str, detail: str = "") -> None:
        super().__init__(
            code="UPSTREAM_ERROR",
            message=f"{platform} API error: {detail}" if detail else f"{platform} API error",
            status_code=502,
        )
        self.platform = platform
        self.detail = detail


class RateLimitedError(UniboardError):
    """Raised when rate limit is exceeded."""

    def __init__(self, detail: str = "Too many requests") -> None:
        super().__init__(
            code="RATE_LIMITED",
            message=detail,
            status_code=429,
        )
        self.detail = detail


class UpstreamUnavailableError(UniboardError):
    """Raised when an upstream service is unavailable."""

    def __init__(self, detail: str = "Upstream service unavailable") -> None:
        super().__init__(
            code="UPSTREAM_UNAVAILABLE",
            message=detail,
            status_code=502,
        )
        self.detail = detail


class ValidationError(UniboardError):
    """Raised when request validation fails."""

    def __init__(self, detail: str = "Validation failed") -> None:
        super().__init__(
            code="VALIDATION_ERROR",
            message=detail,
            status_code=400,
        )
        self.detail = detail


class NotFoundError(UniboardError):
    """Raised when a requested resource is not found."""

    def __init__(self, resource: str = "Resource") -> None:
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} not found",
            status_code=404,
        )
        self.resource = resource


class ConflictError(UniboardError):
    """Raised when a resource conflict occurs (e.g. duplicate entry)."""

    def __init__(self, message: str) -> None:
        super().__init__("CONFLICT", message, 409)
