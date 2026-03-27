"""Integration test fixtures for Phase 15 contract alignment tests.

Provides fixtures that seed full test data and create authenticated HTTP clients,
building on top of the shared conftest.py fixtures (test_engine, session, test_client).
"""

import uuid
from collections.abc import AsyncGenerator
from typing import Any

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.models.user import Profile
from tests.fixtures.seed_phase15 import seed_full_phase15_data


def _unique_email() -> str:
    """Generate a unique test email for registration."""
    return f"phase15-{uuid.uuid4().hex[:8]}@test.com"


async def _register_and_login(
    client: httpx.AsyncClient,
) -> tuple[str, str]:
    """Register a user, login, return (user_id, access_token)."""
    email = _unique_email()
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "display_name": "Phase15 Tester"},
    )
    assert reg.status_code == 201
    user_id: str = reg.json()["data"]["user_id"]

    login = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass123"},
    )
    assert login.status_code == 200
    token: str = login.json()["data"]["access_token"]
    return user_id, token


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

    Returns a dict with keys:
    - user_id: str
    - token: str (JWT access token)
    - course, grades, deadlines, discussions, modules, outline (ORM objects)
    """
    user_id, token = await _register_and_login(test_client)
    test_session = await _get_test_session(test_client)

    # Set GPA target on profile for GPA report test
    profile = await test_session.get(Profile, uuid.UUID(user_id))
    if profile:
        profile.gpa_target = 80.0
        await test_session.flush()

    data = await seed_full_phase15_data(test_session, uuid.UUID(user_id))
    return {
        "user_id": user_id,
        "token": token,
        **data,
    }
