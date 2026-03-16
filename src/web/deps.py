"""Shared FastAPI dependencies for route handlers."""

from datetime import UTC, datetime

from fastapi import Request
from pydantic import BaseModel, ConfigDict

from src.database import get_session as get_session  # noqa: F401 -- re-export
from src.schemas.common import MetaInfo
from src.security.auth import get_current_user as get_current_user  # noqa: F401 -- re-export
from src.security.encryption import (
    TokenEncryption,
    get_encryption as _get_encryption,
)


def get_encryption() -> TokenEncryption:
    """Return TokenEncryption instance from environment config."""
    return _get_encryption()


class _RequestMeta(BaseModel):
    """Internal helper for building MetaInfo."""

    model_config = ConfigDict(from_attributes=True)


def get_request_meta(request: Request) -> MetaInfo:
    """Build MetaInfo from the current request context."""
    request_id: str = getattr(request.state, "request_id", "unknown")
    return MetaInfo(request_id=request_id, timestamp=datetime.now(UTC))


__all__ = [
    "get_session",
    "get_current_user",
    "get_encryption",
    "get_request_meta",
]
