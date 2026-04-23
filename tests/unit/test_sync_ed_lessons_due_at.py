"""Unit tests for Ed Lessons due_at normalisation.

Protects against the 2026-04-23 regression where PR #113's cascade-delete
of duplicate Course rows wiped the lessons safety net, exposing a latent
bug: ``_sync_ed_lessons`` at src/sync/modules.py:274 passed Ed's ISO8601
``due_at`` string straight into a ``TIMESTAMP WITHOUT TIME ZONE`` column.
asyncpg refused the string -> datetime coercion and raised ``DataError``
mid-iteration; because the upsert loop had no per-lesson exception
handler, a single lesson with a scheduled due date would roll back the
entire modules sync transaction and the lessons table would stay empty
after every retry.

The fix (``_normalise_ed_due_at``) coerces Ed due_at values into naive
UTC datetimes before the upsert, and a SAVEPOINT guard around the
per-lesson INSERT keeps one bad row from torching the whole batch.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from src.sync.modules import _normalise_ed_due_at


class TestNormaliseEdDueAt:
    """Cover every shape Ed's ``due_at`` has been observed to take."""

    def test_none_returns_none(self) -> None:
        assert _normalise_ed_due_at(None) is None

    def test_empty_string_returns_none(self) -> None:
        assert _normalise_ed_due_at("") is None

    def test_whitespace_returns_none(self) -> None:
        assert _normalise_ed_due_at("   \t\n") is None

    def test_naive_iso_string_parses_without_shifting(self) -> None:
        # No tz in the string -> return as-is (caller decides semantics).
        result = _normalise_ed_due_at("2026-05-08T10:00:00")
        assert result == datetime(2026, 5, 8, 10, 0, 0)
        assert result is not None
        assert result.tzinfo is None

    def test_utc_z_suffix_converts_to_naive_utc(self) -> None:
        # Python <3.11 can't parse Z directly; we swap to +00:00 and then
        # strip tzinfo -- wall clock in UTC remains identical.
        result = _normalise_ed_due_at("2026-05-08T13:59:00Z")
        assert result == datetime(2026, 5, 8, 13, 59, 0)
        assert result is not None
        assert result.tzinfo is None

    def test_aware_aest_offset_converts_to_utc_wall_clock(self) -> None:
        # 23:59 AEST (+10:00) == 13:59 UTC. Stored value must be the UTC
        # wall clock because the column is TIMESTAMP WITHOUT TIME ZONE.
        result = _normalise_ed_due_at("2026-05-08T23:59:00+10:00")
        assert result == datetime(2026, 5, 8, 13, 59, 0)
        assert result is not None
        assert result.tzinfo is None

    def test_aware_datetime_object_converts_to_utc(self) -> None:
        # Defensive: some future code path may hand the helper an already-
        # parsed datetime. Aware -> naive UTC.
        aest = timezone(timedelta(hours=10))
        dt = datetime(2026, 5, 8, 23, 59, 0, tzinfo=aest)
        result = _normalise_ed_due_at(dt)
        assert result == datetime(2026, 5, 8, 13, 59, 0)
        assert result is not None
        assert result.tzinfo is None

    def test_naive_datetime_passes_through(self) -> None:
        dt = datetime(2026, 5, 8, 10, 0, 0)
        assert _normalise_ed_due_at(dt) == dt

    def test_unparseable_string_returns_none(self) -> None:
        # Graceful degradation: bad input logs a warning and nulls the
        # column instead of aborting the whole sync.
        assert _normalise_ed_due_at("not-a-date") is None

    def test_non_string_non_datetime_returns_none(self) -> None:
        # Defensive: unexpected types null out rather than raising.
        assert _normalise_ed_due_at(123) is None
        assert _normalise_ed_due_at({"wat": "wat"}) is None
        assert _normalise_ed_due_at(["2026-05-08"]) is None


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("2026-01-01T00:00:00+00:00", datetime(2026, 1, 1, 0, 0, 0)),
        ("2026-12-31T23:59:59Z", datetime(2026, 12, 31, 23, 59, 59)),
        ("2026-06-15T12:00:00-05:00", datetime(2026, 6, 15, 17, 0, 0)),
        ("2026-06-15T12:00:00+11:00", datetime(2026, 6, 15, 1, 0, 0)),
    ],
)
def test_normalise_ed_due_at_timezone_conversions(
    raw: str, expected: datetime
) -> None:
    """Cross-timezone sanity: every aware input is converted to UTC wall clock."""
    assert _normalise_ed_due_at(raw) == expected
