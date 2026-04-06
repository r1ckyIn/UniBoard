"""Shared infrastructure for sync tasks (session factory, history recording)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import get_settings

logger = structlog.get_logger()

# Maximum retry attempts for transient failures
_MAX_RETRIES = 3

# Singleton engine to avoid leaking connection pools on repeated sync calls
_sync_engine: AsyncEngine | None = None


def _get_sync_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create a session factory for sync tasks (outside HTTP request context).

    Reuses a single engine instance to avoid connection pool leaks.
    """
    global _sync_engine  # noqa: PLW0603
    if _sync_engine is None:
        settings = get_settings()
        _sync_engine = create_async_engine(
            settings.database_url,
            pool_size=3,
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"prepared_statement_cache_size": 0},
        )
    return async_sessionmaker(_sync_engine, class_=AsyncSession, expire_on_commit=False)


async def dispose_sync_engine() -> None:
    """Dispose the sync engine's connection pool.

    Called during application shutdown to prevent connection leaks.
    """
    global _sync_engine  # noqa: PLW0603
    if _sync_engine is not None:
        await _sync_engine.dispose()
        _sync_engine = None
        logger.info("sync_engine_disposed")


async def _record_sync_history(
    session_factory: async_sessionmaker[AsyncSession],
    user_id: uuid.UUID,
    domain: str,
    status: str,
    records_updated: int = 0,
    error_message: str | None = None,
    started_at: datetime | None = None,
) -> None:
    """Insert a sync_history record for audit trail."""
    from src.models.sync_history import SyncHistory

    now = datetime.now(UTC)
    async with session_factory() as session:
        entry = SyncHistory(
            user_id=user_id,
            domain=domain,
            status=status,
            records_updated=records_updated,
            error_message=error_message,
            started_at=started_at or now,
            completed_at=now,
        )
        session.add(entry)
        await session.commit()
