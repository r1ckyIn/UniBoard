"""Integration test fixtures for Phase 15 contract alignment tests.

Provides fixtures that seed full test data and create authenticated HTTP clients,
building on top of the shared conftest.py fixtures (test_engine, session, test_client).

Auth: Creates a Supabase-compatible JWT directly (no register/login endpoint needed).
"""

import os
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

import httpx
import jwt
import pytest_asyncio
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from src.config import get_settings
from src.database import get_session
from src.models.user import Profile
from tests.fixtures.seed_phase15 import seed_full_phase15_data


def _create_test_jwt(user_id: str) -> str:
    """Create a valid Supabase-compatible JWT for test authentication.

    Uses the default dev JWT secret from config.
    """
    settings = get_settings()
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "iss": "supabase-test",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,  # 1 hour expiry
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


async def _get_test_session(client: httpx.AsyncClient) -> AsyncSession:
    """Extract the test session from the client's app dependency override."""
    app = client._transport.app  # type: ignore[union-attr]
    override_fn = app.dependency_overrides[get_session]
    gen = override_fn()
    return await gen.__anext__()


@pytest_asyncio.fixture(loop_scope="session")
async def phase15_seed_data(
    test_client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Seed full Phase 15 test data: course, grades, deadlines, discussions, modules, outline.

    Creates a Profile directly in DB and generates a JWT for auth.

    Returns a dict with keys:
    - user_id: str
    - token: str (JWT access token)
    - course, grades, deadlines, discussions, modules, outline (ORM objects)
    """
    test_session = await _get_test_session(test_client)

    # Create profile directly in DB (bypassing Supabase auth)
    user_id = uuid.uuid4()
    profile = Profile(
        id=user_id,
        display_name="Phase15 Tester",
        gpa_target=80.0,
        gpa_scale="wam",
    )
    test_session.add(profile)
    await test_session.flush()

    # Generate JWT matching this user
    token = _create_test_jwt(str(user_id))

    # Seed all test data
    data = await seed_full_phase15_data(test_session, user_id)
    return {
        "user_id": str(user_id),
        "token": token,
        **data,
    }


@pytest_asyncio.fixture(loop_scope="session")
async def real_data_user(
    test_engine: AsyncEngine,
) -> AsyncGenerator[Profile, None]:
    """Create a Profile row with encrypted real Canvas+Ed tokens from env vars.

    Env vars required (the test_sync_real_data module-level pytestmark skips when
    SYNC_REAL_DATA_CANVAS_TOKEN is unset):
      - SYNC_REAL_DATA_CANVAS_TOKEN
      - SYNC_REAL_DATA_ED_TOKEN
      - SYNC_REAL_DATA_USER_EMAIL

    Commits the Profile on a dedicated session (separate from the test's rollback
    session) so that ``sync_all_courses()`` -- which uses its own session_factory
    pointing at ``settings.database_url`` -- can see the profile. Cleans up by
    deleting the Profile row in a finalizer; the ``courses`` relationship has
    ``cascade="all, delete-orphan"`` so dependent rows cascade.

    NOTE: For real-data runs, the developer must ensure ``DATABASE_URL`` (used by
    the sync pipeline via ``get_settings().database_url``) resolves to the same
    Postgres as the tests' ``TEST_DATABASE_URL`` constant in the top-level
    conftest.py. Otherwise sync writes land in a different database than the
    one the test assertions query.
    """
    from src.security.encryption import get_encryption

    canvas_token = os.environ["SYNC_REAL_DATA_CANVAS_TOKEN"]
    ed_token = os.environ["SYNC_REAL_DATA_ED_TOKEN"]
    email = os.environ["SYNC_REAL_DATA_USER_EMAIL"]

    enc = get_encryption()
    factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    user_id = uuid.uuid4()
    async with factory() as commit_session:
        profile = Profile(
            id=user_id,
            display_name=email,
            canvas_api_token_encrypted=enc.encrypt(canvas_token),
            ed_api_token_encrypted=enc.encrypt(ed_token),
            canvas_token_status="active",
            ed_token_status="active",
        )
        commit_session.add(profile)
        await commit_session.commit()
        await commit_session.refresh(profile)

    try:
        yield profile
    finally:
        async with factory() as cleanup_session:
            await cleanup_session.execute(
                delete(Profile).where(Profile.id == user_id)
            )
            await cleanup_session.commit()
