"""Supabase JWT validation and FastAPI auth dependency."""

import uuid
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import get_settings

security = HTTPBearer(auto_error=False)


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    """Decode and validate a Supabase-issued JWT.

    Verifies HS256 signature, audience="authenticated", and expiration.

    Raises:
        HTTPException(401): If the token is expired, invalid, or has wrong audience.

    Returns:
        Decoded payload dictionary containing sub, aud, role, etc.
    """
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def get_current_user_id(
    cred: HTTPAuthorizationCredentials | None = Depends(security),
) -> uuid.UUID:
    """FastAPI dependency: extract user_id (sub claim) from Supabase JWT.

    Raises:
        HTTPException(401): If no Bearer token provided or token is invalid.

    Returns:
        UUID of the authenticated user from the JWT sub claim.
    """
    if cred is None:
        raise HTTPException(status_code=401, detail="Bearer authentication required")
    payload = decode_supabase_jwt(cred.credentials)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")
    return uuid.UUID(sub)
