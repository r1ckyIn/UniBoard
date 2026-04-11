"""Regression test for SyncHistory timezone-aware datetime handling.

Regression test for UNIBOARD-API-B/F/9/T/A/G.

Root cause: ``src/models/sync_history.py`` declares ``started_at`` and
``completed_at`` as naive ``Mapped[datetime]``, but the DB schema
(``supabase/migrations/00000000000003_sync_history.sql``) defines them as
``TIMESTAMPTZ``. Because Supavisor forces ``prepared_statement_cache_size=0``
(see ``src/sync/_shared.py:107`` and ``src/database.py:34``), asyncpg binds
parameters via SQLAlchemy's type codec for naive ``DateTime``, which rejects
the tz-aware ``datetime.now(UTC)`` values every production caller passes in
(grades.py:136, discussions.py:47, deadlines.py:38, modules.py:48,
courses.py:93, outlines.py:52, _shared.py:136).

Evidence: 434 Sentry events across issues UNIBOARD-API-B, F, 9, T, A, G.

This test persists a ``SyncHistory`` row with tz-aware timestamps and asserts
the round-tripped values keep their tzinfo. It is expected to FAIL against the
current buggy model (naive columns) and PASS once the columns are redeclared
as ``DateTime(timezone=True)``.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.sync_history import SyncHistory
from src.models.user import Profile


@pytest.mark.asyncio
async def test_sync_history_accepts_timezone_aware_datetime_regression(
    session: AsyncSession,
) -> None:
    """Regression test for UNIBOARD-API-B/F/9/T/A/G.

    Production callers pass ``datetime.now(UTC)`` (tz-aware) to
    ``SyncHistory.started_at`` / ``completed_at``. The ORM columns must accept
    and preserve the timezone; with naive column types asyncpg raises a
    DataError about mixing naive and aware datetimes.
    """
    # Profile is required by FK sync_history.user_id -> profiles.id
    profile = Profile(
        id=uuid.uuid4(),
        display_name="SyncHistory TZ Regression",
    )
    session.add(profile)
    await session.flush()

    started = datetime.now(UTC)
    completed = datetime.now(UTC)

    assert started.tzinfo is not None, "precondition: started must be tz-aware"
    assert completed.tzinfo is not None, "precondition: completed must be tz-aware"

    history = SyncHistory(
        user_id=profile.id,
        domain="grades",
        status="success",
        records_updated=1,
        started_at=started,
        completed_at=completed,
    )
    session.add(history)
    # Flush triggers the asyncpg INSERT that crashes on naive columns.
    await session.flush()

    # Expire then reload to ensure values come from the DB, not the identity map.
    history_id = history.id
    session.expire_all()

    result = await session.execute(
        select(SyncHistory).where(SyncHistory.id == history_id)
    )
    fetched = result.scalar_one()

    assert fetched.started_at is not None
    assert fetched.completed_at is not None
    assert fetched.started_at.tzinfo is not None, (
        "started_at lost tzinfo after round-trip — column must be "
        "DateTime(timezone=True)"
    )
    assert fetched.completed_at.tzinfo is not None, (
        "completed_at lost tzinfo after round-trip — column must be "
        "DateTime(timezone=True)"
    )
