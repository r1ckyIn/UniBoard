"""Regression test for SyncHistory timezone-aware datetime handling.

SyncHistory.started_at / completed_at map to TIMESTAMPTZ columns in the DB
schema. When the ORM declared them as naive Mapped[datetime], asyncpg's
naive-timestamp codec raised on bind whenever a production caller passed
datetime.now(UTC) — see UNIBOARD-API-B/F/9/T/A/G on Sentry for the outage.

This test persists a SyncHistory row with a tz-aware timestamp and re-reads
it: against the buggy naive declaration flush() fails; with the corrected
DateTime(timezone=True) declaration it round-trips cleanly.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.sync_history import SyncHistory
from src.models.user import Profile


@pytest.mark.asyncio
async def test_sync_history_accepts_timezone_aware_datetime_regression(
    session: AsyncSession,
) -> None:
    profile = Profile(id=uuid.uuid4(), display_name="SyncHistory TZ Regression")
    now = datetime.now(UTC)
    history = SyncHistory(
        user_id=profile.id,
        domain="grades",
        status="success",
        records_updated=1,
        started_at=now,
        completed_at=now,
    )
    session.add_all([profile, history])
    await session.flush()
    await session.refresh(history)

    assert history.started_at.tzinfo is not None
    assert history.completed_at is not None
    assert history.completed_at.tzinfo is not None
