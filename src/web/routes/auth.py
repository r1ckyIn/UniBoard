"""Auth endpoints: register, login, refresh."""

import uuid

import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.user import User
from src.schemas.auth import (
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
)
from src.schemas.common import SuccessResponse, UniboardError
from src.security.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
)
from src.security.password import hash_password, verify_password
from src.web.deps import get_request_meta, get_session

logger = structlog.get_logger()

router = APIRouter()


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[RegisterResponse]:
    """Register a new user account."""
    # Check if email already exists
    stmt = select(User).where(User.email == body.email)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise UniboardError("CONFLICT", "Email already registered", 409)

    # Create user with hashed password
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    session.add(user)
    await session.flush()

    logger.info("auth.register_success", user_id=str(user.id))

    return SuccessResponse(
        data=RegisterResponse(
            user_id=str(user.id),
            email=user.email,
            display_name=user.display_name,
        ),
        meta=get_request_meta(request),
    )


@router.post("/login")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[LoginResponse]:
    """Authenticate user and return JWT tokens."""
    settings = get_settings()

    # Fetch user by email (form.username contains the email)
    stmt = select(User).where(User.email == form.username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    # Generic error to prevent email enumeration
    if user is None or not verify_password(form.password, user.hashed_password):
        raise UniboardError("AUTH_REQUIRED", "Invalid email or password", 401)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    logger.info("auth.login_success", user_id=str(user.id))

    return SuccessResponse(
        data=LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        ),
        meta=get_request_meta(request),
    )


@router.post("/refresh")
async def refresh(
    body: RefreshRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[LoginResponse]:
    """Exchange a refresh token for a new access token."""
    settings = get_settings()
    payload = decode_access_token(body.refresh_token)

    # Only accept refresh tokens
    token_type = payload.get("type")
    if token_type != "refresh":
        raise UniboardError("AUTH_REQUIRED", "Invalid token type", 401)

    sub = payload.get("sub")
    if sub is None:
        raise UniboardError("AUTH_REQUIRED", "Invalid token: missing sub", 401)

    # Verify user still exists
    user = await session.get(User, uuid.UUID(sub))
    if user is None:
        raise UniboardError("AUTH_REQUIRED", "User not found", 401)

    # Issue new access token (refresh token stays the same)
    new_access_token = create_access_token({"sub": str(user.id)})

    logger.info("auth.refresh_success", user_id=str(user.id))

    return SuccessResponse(
        data=LoginResponse(
            access_token=new_access_token,
            refresh_token=body.refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        ),
        meta=get_request_meta(request),
    )
