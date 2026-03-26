"""Tests for Supabase JWT validation in src.security.auth."""

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import jwt
import pytest
from fastapi import HTTPException

# Test constants
TEST_JWT_SECRET = "test-jwt-secret-with-at-least-32-chars-long-enough"
TEST_USER_ID = str(uuid.uuid4())


def _make_token(
    sub: str = TEST_USER_ID,
    aud: str = "authenticated",
    exp_delta: timedelta = timedelta(hours=1),
    secret: str = TEST_JWT_SECRET,
) -> str:
    """Build a Supabase-style JWT for testing."""
    payload = {
        "sub": sub,
        "aud": aud,
        "exp": datetime.now(UTC) + exp_delta,
        "role": "authenticated",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@patch("src.security.auth.get_settings")
def test_decode_valid_token(mock_settings: object) -> None:
    mock_settings.return_value.supabase_jwt_secret = TEST_JWT_SECRET  # type: ignore[union-attr]
    from src.security.auth import decode_supabase_jwt

    token = _make_token()
    payload = decode_supabase_jwt(token)
    assert payload["sub"] == TEST_USER_ID


@patch("src.security.auth.get_settings")
def test_decode_expired_token(mock_settings: object) -> None:
    mock_settings.return_value.supabase_jwt_secret = TEST_JWT_SECRET  # type: ignore[union-attr]
    from src.security.auth import decode_supabase_jwt

    token = _make_token(exp_delta=timedelta(hours=-1))
    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_jwt(token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


@patch("src.security.auth.get_settings")
def test_decode_wrong_secret(mock_settings: object) -> None:
    mock_settings.return_value.supabase_jwt_secret = (  # type: ignore[union-attr]
        "wrong-secret-that-is-long-enough-for-validation"
    )
    from src.security.auth import decode_supabase_jwt

    token = _make_token()
    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_jwt(token)
    assert exc_info.value.status_code == 401


@patch("src.security.auth.get_settings")
def test_decode_wrong_audience(mock_settings: object) -> None:
    mock_settings.return_value.supabase_jwt_secret = TEST_JWT_SECRET  # type: ignore[union-attr]
    from src.security.auth import decode_supabase_jwt

    token = _make_token(aud="wrong-audience")
    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_jwt(token)
    assert exc_info.value.status_code == 401


# get_current_user_id tests


@patch("src.security.auth.get_settings")
async def test_get_current_user_id_valid(mock_settings: object) -> None:
    mock_settings.return_value.supabase_jwt_secret = TEST_JWT_SECRET  # type: ignore[union-attr]
    from fastapi.security import HTTPAuthorizationCredentials

    from src.security.auth import get_current_user_id

    token = _make_token()
    cred = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user_id = await get_current_user_id(cred)
    assert user_id == uuid.UUID(TEST_USER_ID)


async def test_get_current_user_id_missing() -> None:
    from src.security.auth import get_current_user_id

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_id(None)
    assert exc_info.value.status_code == 401
