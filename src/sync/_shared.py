"""Shared infrastructure for sync tasks (session factory, history recording)."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import sentry_sdk
import structlog
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import get_settings

logger = structlog.get_logger()

# Maximum retry attempts for transient failures (API-level)
_MAX_RETRIES = 3

# Maximum retry attempts for database connection errors
_DB_MAX_RETRIES = 2

# Singleton engine to avoid leaking connection pools on repeated sync calls
_sync_engine: AsyncEngine | None = None


def _is_transient_db_error(exc: Exception) -> bool:
    """Check if a database error is transient and worth retrying."""
    msg = str(exc).lower()
    transient_patterns = (
        "connection reset",
        "connection refused",
        "connection timed out",
        "server closed the connection",
        "ssl connection has been closed",
        "terminating connection",
        "could not connect",
        "broken pipe",
        "too many clients",
        "remaining connection slots",
        "prepared statement",
        "invalidsqlstatementname",
    )
    return any(p in msg for p in transient_patterns)


async def db_retry_session(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncSession:
    """Create a session with retry logic for transient DB connection errors.

    Retries up to _DB_MAX_RETRIES times with exponential backoff when
    the database connection fails due to transient errors (connection reset,
    timeout, SSL closure, etc.).
    """
    last_exc: Exception | None = None
    for attempt in range(_DB_MAX_RETRIES + 1):
        try:
            session = session_factory()
            # Verify the connection is alive by starting the session context
            return session
        except (DBAPIError, OperationalError, OSError) as exc:
            last_exc = exc
            if attempt < _DB_MAX_RETRIES and _is_transient_db_error(exc):
                wait = 2**attempt
                logger.warning(
                    "db_connection_retry",
                    attempt=attempt + 1,
                    wait_seconds=wait,
                    error=str(exc)[:200],
                )
                await asyncio.sleep(wait)
            else:
                # Non-transient or exhausted retries -- report to Sentry once
                sentry_sdk.set_context("sync_db", {
                    "attempt": attempt + 1,
                    "transient": _is_transient_db_error(exc),
                })
                raise
    # Should not reach here, but satisfy type checker
    raise last_exc  # type: ignore[misc]


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
            max_overflow=3,
            pool_timeout=20,
            pool_recycle=300,
            # pool_pre_ping disabled: Supavisor transaction pooler causes
            # InvalidSQLStatementNameError on ping's prepared statement.
            pool_pre_ping=False,
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
