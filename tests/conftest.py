"""Shared test fixtures for integration tests."""

from collections.abc import AsyncGenerator

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.database import get_session
from src.models.base import Base
from src.security.encryption import TokenEncryption
from src.web.main import create_app

# Use the same database (uniboard_dev) with per-test transaction rollback
TEST_DATABASE_URL = (
    "postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev"
)


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Session-scoped async engine. Creates all tables, disposes on teardown."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def session(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session with transaction rollback for isolation."""
    factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with factory() as session, session.begin():
        yield session
        await session.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def test_client(
    test_engine: AsyncEngine,
) -> AsyncGenerator[httpx.AsyncClient, None]:
    """httpx AsyncClient with per-test session override for isolation.

    Each test gets its own session in a transaction that rolls back
    after the test, ensuring full isolation.
    """
    app = create_app()

    # Create a per-test session that will be rolled back
    factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with factory() as test_session, test_session.begin():

        async def _override_get_session() -> AsyncGenerator[AsyncSession, None]:
            """Override get_session to use test session within transaction."""
            yield test_session

        app.dependency_overrides[get_session] = _override_get_session

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            yield client

        await test_session.rollback()

    app.dependency_overrides.clear()


@pytest.fixture
def encryption() -> TokenEncryption:
    """TokenEncryption with a fixed test key (NOT for production)."""
    test_key = b"test-key-for-unit-testing-only!!"  # Exactly 32 bytes
    return TokenEncryption(test_key)
