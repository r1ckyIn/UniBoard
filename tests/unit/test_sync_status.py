"""Unit tests for sync status per-platform aggregation logic.

Plan 33-03: GET /sync/status response gains a `per_platform_counts` field
that groups domain counters (grades, deadlines, discussions) under their
source platform (canvas, ed). This test pins the aggregation logic that
maps SyncResults -> PerPlatformCounts.
"""

from __future__ import annotations

from src.schemas.sync import (
    CanvasPlatformCounts,
    EdPlatformCounts,
    PerPlatformCounts,
    SyncCount,
    SyncResults,
)
from src.web.routes.sync import DOMAIN_TO_PLATFORM, aggregate_per_platform_counts


def _count(n: int) -> SyncCount:
    """Helper: build a SyncCount with `synced=n`."""
    return SyncCount(synced=n, new=0, updated=n)


def test_per_platform_counts_groups_all_three_domains() -> None:
    """Test 1: grades=8, deadlines=124, discussions=92 -> canvas total=132, ed total=92."""
    results = SyncResults(
        grades=_count(8),
        deadlines=_count(124),
        discussions=_count(92),
    )

    counts = aggregate_per_platform_counts(results)

    assert counts is not None
    assert counts.canvas == CanvasPlatformCounts(grades=8, deadlines=124, total=132)
    assert counts.ed == EdPlatformCounts(discussions=92, total=92)


def test_per_platform_counts_none_when_no_sync_history() -> None:
    """Test 2: no sync history -> per_platform_counts is None."""
    # `None` signals "no sync has happened yet" (matches last_sync=None semantics).
    counts = aggregate_per_platform_counts(None)

    assert counts is None


def test_per_platform_counts_only_deadlines_populated() -> None:
    """Test 3: only deadlines present -> grades=0, discussions=0, deadlines=N."""
    results = SyncResults(
        grades=None,
        deadlines=_count(50),
        discussions=None,
    )

    counts = aggregate_per_platform_counts(results)

    assert counts is not None
    assert counts.canvas == CanvasPlatformCounts(grades=0, deadlines=50, total=50)
    assert counts.ed == EdPlatformCounts(discussions=0, total=0)


def test_existing_sync_results_shape_preserved() -> None:
    """Test 4: SyncResults still carries grades/deadlines/discussions fields unchanged."""
    results = SyncResults(grades=_count(1), deadlines=_count(2), discussions=_count(3))

    # Existing fields must remain accessible by name (no renaming).
    assert results.grades is not None and results.grades.synced == 1
    assert results.deadlines is not None and results.deadlines.synced == 2
    assert results.discussions is not None and results.discussions.synced == 3


def test_domain_to_platform_mapping_locked_in_code() -> None:
    """The domain->platform mapping is the single source of truth for grouping."""
    assert DOMAIN_TO_PLATFORM == {
        "grades": "canvas",
        "deadlines": "canvas",
        "discussions": "ed",
    }


def test_per_platform_counts_sum_totals_match_domain_counts() -> None:
    """Aggregation invariant: canvas.total = grades + deadlines; ed.total = discussions."""
    results = SyncResults(
        grades=_count(3),
        deadlines=_count(7),
        discussions=_count(11),
    )

    counts = aggregate_per_platform_counts(results)

    assert counts is not None
    assert counts.canvas.total == counts.canvas.grades + counts.canvas.deadlines
    assert counts.ed.total == counts.ed.discussions
