"""JWT creation, validation, and OAuth2 scheme for FastAPI."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_session
from src.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        data: Claims to include (must contain 'sub' with user ID).
        expires_delta: Custom expiration; defaults to settings.access_token_expire_minutes.

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    to_encode = data.copy()
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    to_encode["exp"] = datetime.now(UTC) + expires_delta
    to_encode["type"] = "access"
    to_encode["jti"] = str(uuid.uuid4())
    encoded: str = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a signed JWT refresh token.

    Args:
        data: Claims to include (must contain 'sub' with user ID).

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    to_encode = data.copy()
    expires_delta = timedelta(days=settings.refresh_token_expire_days)
    to_encode["exp"] = datetime.now(UTC) + expires_delta
    to_encode["type"] = "refresh"
    to_encode["jti"] = str(uuid.uuid4())
    encoded: str = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token.

    Raises:
        HTTPException(401): If the token is expired or invalid.

    Returns:
        Decoded payload dictionary.
    """
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.secret_key, algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """FastAPI dependency: extract and verify current user from Bearer token.

    Validates token type is 'access' and fetches User from database.

    Raises:
        HTTPException(401): If token is invalid, wrong type, or user not found.
    """
    payload = decode_access_token(token)

    # Reject refresh tokens used as access tokens
    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")

    user = await session.get(User, uuid.UUID(sub))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user
