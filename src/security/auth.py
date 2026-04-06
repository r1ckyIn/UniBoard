"""Supabase JWT validation and FastAPI auth dependency."""

import uuid
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from src.config import get_settings

security = HTTPBearer(auto_error=False)

# Cache the JWKS client so we don't fetch keys on every request
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Lazily create a cached JWKS client for Supabase's public keys."""
    global _jwks_client  # noqa: PLW0603
    if _jwks_client is None:
        settings = get_settings()
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    """Decode and validate a Supabase-issued JWT.

    Supports both ES256 (new ECC keys) and HS256 (legacy shared secret).
    Tries ES256 via JWKS first, falls back to HS256 with legacy secret.

    Raises:
        HTTPException(401): If the token is expired, invalid, or has wrong audience.

    Returns:
        Decoded payload dictionary containing sub, aud, role, etc.
    """
    # Try ES256 (JWKS) first — Supabase's current signing method
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload: dict[str, Any] = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        return payload
    except (jwt.InvalidTokenError, Exception):
        pass

    # Fall back to HS256 (legacy shared secret)
    settings = get_settings()
    try:
        payload = jwt.decode(
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
