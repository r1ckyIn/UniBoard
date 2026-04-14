"""Unit tests for _sync_user_grades -- SYNC-FIX-02 submission include.

Wave 0 laid a RED-state stub. Plan 32.1-03 Task 2 flips it to strict-green with
realistic tests: the fix is a one-liner (add include=['submission'] kwarg) so the
tests verify (1) the kwarg is passed through, and (2) fixture score values flow
into Grade row upserts.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.course import Course
from src.models.user import Profile
from src.sync.grades import _sync_user_grades

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


def _make_profile() -> Profile:
    """Build a Profile mock suitable for _sync_user_grades."""
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.canvas_api_token_encrypted = "enc-canvas"
    profile.canvas_token_status = "active"
    profile.canvas_sync_status = "pending"
    profile.canvas_last_synced_at = None
    return profile


def _make_course(user_id: uuid.UUID, canvas_course_id: str = "course-1") -> Course:
    """Build a Course mock with a linked canvas_course_id."""
    course = MagicMock(spec=Course)
    course.id = uuid.uuid4()
    course.user_id = user_id
    course.canvas_course_id = canvas_course_id
    course.code = "COMP2017"
    return course


def _build_mock_session(user_courses: list[Course]) -> AsyncMock:
    """Return an AsyncSession mock that yields the given Course list on execute()."""
    session = AsyncMock()

    async def _execute(stmt: object) -> MagicMock:
        result = MagicMock()
        result.scalars.return_value.all.return_value = user_courses
        return result

    session.execute = AsyncMock(side_effect=_execute)
    session.commit = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_submission_include_kwarg_passed() -> None:
    """_sync_user_grades must call adapter.get_assignments(course_id, include=['submission'])."""
    profile = _make_profile()
    course = _make_course(profile.id, canvas_course_id="course-1")
    session = _build_mock_session([course])

    assignments = json.loads(
        (FIXTURES / "assignments_with_submission.json").read_text()
    )

    with patch("src.adapters.canvas.CanvasAdapter") as MockAdapter:
        adapter = AsyncMock()
        adapter.get_courses = AsyncMock(
            return_value=[{"id": "course-1", "name": "COMP2017"}]
        )
        adapter.get_assignments = AsyncMock(return_value=assignments)
        adapter.close = AsyncMock()
        MockAdapter.return_value = adapter

        await _sync_user_grades(profile, "plain-token", session)

        # Verify include=['submission'] kwarg was passed
        adapter.get_assignments.assert_called_with(
            "course-1", include=["submission"]
        )


@pytest.mark.asyncio
async def test_grade_score_written_from_submission() -> None:
    """Fixture scores (17.5, 15.0) flow into Grade row upsert values."""
    profile = _make_profile()
    course = _make_course(profile.id, canvas_course_id="course-1")
    session = _build_mock_session([course])

    assignments = json.loads(
        (FIXTURES / "assignments_with_submission.json").read_text()
    )

    # Capture INSERT statement values on session.execute for insert_stmt calls
    captured_values: list[dict[str, object]] = []
    original_execute = session.execute.side_effect

    async def _execute_capture(stmt: object) -> MagicMock:
        # pg_insert(Grade) statements have a compile() that exposes params;
        # we compile without a dialect to surface the values dict via
        # stmt.compile().params, which is the canonical way to introspect.
        if hasattr(stmt, "compile"):
            try:
                compiled = stmt.compile(compile_kwargs={"literal_binds": False})
                params = getattr(compiled, "params", None)
                if params and "score" in params:
                    captured_values.append(dict(params))
            except Exception:
                pass
        # Delegate to the original execute for SELECT semantics
        if original_execute is not None:
            return await original_execute(stmt)  # type: ignore[misc]
        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        return result

    session.execute = AsyncMock(side_effect=_execute_capture)

    with patch("src.adapters.canvas.CanvasAdapter") as MockAdapter:
        adapter = AsyncMock()
        adapter.get_courses = AsyncMock(
            return_value=[{"id": "course-1", "name": "COMP2017"}]
        )
        adapter.get_assignments = AsyncMock(return_value=assignments)
        adapter.close = AsyncMock()
        MockAdapter.return_value = adapter

        count = await _sync_user_grades(profile, "plain-token", session)

    # 3 assignments upserted (assignment 3 has score=null -> stored as None)
    assert count == 3

    # Find scores captured for assignments 1 + 2
    scores = [v.get("score") for v in captured_values]
    assert 17.5 in scores, f"expected score=17.5 in captured rows, got {scores}"
    assert 15.0 in scores, f"expected score=15.0 in captured rows, got {scores}"

    # Verify the post-sync status update happened
    assert profile.canvas_sync_status == "success"
    assert isinstance(profile.canvas_last_synced_at, datetime)
    # Naive datetime check: just ensure timezone is preserved
    assert profile.canvas_last_synced_at.tzinfo == UTC
