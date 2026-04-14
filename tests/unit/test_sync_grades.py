"""Unit tests for sync_all_grades — SYNC-FIX-02 submission include.

Stubs created in Wave 0. Wave 2 (Plan 32.1-03) adds include=["submission"] kwarg.
The stub body here is intentionally minimal (single pytest.xfail call) so that when
Plan 32.1-03 flips xfail->strict, the executor authors the realistic mock rig from
scratch with no half-built scaffolding to reconcile.
"""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
@pytest.mark.xfail(reason="Wave 2: grades sync does not pass include=['submission'] yet", strict=False)
async def test_submission_include() -> None:
    """_sync_user_grades must call adapter.get_assignments(course_id, include=['submission']).

    Placeholder body -- Plan 32.1-03 Task 2 replaces this with a realistic TDD test using
    AsyncMock on adapter + the assignments_with_submission.json fixture.
    """
    pytest.xfail("Wave 2: not implemented (Plan 32.1-03 will populate)")
