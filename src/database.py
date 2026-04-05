"""Async database engine and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_engine() -> AsyncEngine:
    """Lazily create the async engine on first use."""
    global _engine  # noqa: PLW0603
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300,
            pool_pre_ping=True,
            echo=settings.debug,
            # Disable prepared statement cache for Supavisor transaction pooler
            connect_args={"prepared_statement_cache_size": 0},
        )
    return _engine


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Lazily create the session factory on first use."""
    global _session_factory  # noqa: PLW0603
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            _get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def dispose_engine() -> None:
    """Dispose the main database engine's connection pool.

    Called during application shutdown to prevent connection leaks.
    """
    global _engine  # noqa: PLW0603
    global _session_factory  # noqa: PLW0603
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency -- yields one session per request."""
    factory = _get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
