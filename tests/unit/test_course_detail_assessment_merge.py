"""Unit tests for courses route assessment merge logic.

Covers the helper functions added by the course-materials-fetch-gaps debug
session:
  * _assessment_weights_from_outline
  * _merge_assessment_weights
  * _latest_unit_outline
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

from src.schemas.course import AssessmentWeightResponse
from src.web.routes.courses import (
    _assessment_weights_from_outline,
    _latest_unit_outline,
    _merge_assessment_weights,
)


def _fake_outline(
    assessments: list[dict] | None,
    fetched_at: datetime | None = None,
) -> MagicMock:
    """Build a MagicMock that looks like a UnitOutline ORM row."""
    outline = MagicMock()
    outline.id = uuid.uuid4()
    outline.assessments = assessments
    outline.fetched_at = fetched_at
    outline.updated_at = fetched_at
    return outline


class TestAssessmentWeightsFromOutline:
    """_assessment_weights_from_outline converts outline JSON -> response rows."""

    def test_basic_conversion(self) -> None:
        outline = _fake_outline(
            [
                {"name": "Final Exam", "weight": 0.5, "due_date": "2026-06-15"},
                {"name": "Assignment 1", "weight": 0.2, "due_date": "2026-04-01"},
            ]
        )
        rows = _assessment_weights_from_outline(outline)
        assert [r.name for r in rows] == ["Final Exam", "Assignment 1"]
        # Pass the fraction through unchanged -- the frontend multiplies by
        # 100 for display, so pre-scaling here double-counts (5000% bug).
        assert [r.weight for r in rows] == [0.5, 0.2]
        assert all(r.status == "upcoming" for r in rows)
        assert rows[1].due_date == "2026-04-01"

    def test_skips_blank_names_and_non_dicts(self) -> None:
        outline = _fake_outline(
            [
                {"name": "Valid", "weight": 0.3},
                {"name": "", "weight": 0.2},
                "not-a-dict",  # type: ignore[list-item]
                {"name": "   ", "weight": 0.1},
            ]
        )
        rows = _assessment_weights_from_outline(outline)
        assert [r.name for r in rows] == ["Valid"]

    def test_invalid_weight_becomes_zero(self) -> None:
        outline = _fake_outline([{"name": "Quiz", "weight": "N/A"}])
        rows = _assessment_weights_from_outline(outline)
        assert len(rows) == 1
        assert rows[0].weight == 0.0

    def test_empty_outline(self) -> None:
        outline = _fake_outline(None)
        rows = _assessment_weights_from_outline(outline)
        assert rows == []

    def test_drops_non_iso_due_date(self) -> None:
        """Outline parser surfaces duration hints like '2 hours' in the
        due_date slot; the route must coerce those to None so the frontend
        date-fns path does not throw RangeError: Invalid time value."""
        outline = _fake_outline(
            [
                {"name": "Final Exam", "weight": 0.5, "due_date": "2 hours"},
                {"name": "P1", "weight": 0.125, "due_date": "50 minutes"},
                {"name": "Assignment", "weight": 0.2, "due_date": "2026-06-15"},
                {"name": "Quiz", "weight": 0.1, "due_date": "2026-06-01T10:00:00Z"},
                {"name": "Lab", "weight": 0.05, "due_date": None},
            ]
        )
        rows = _assessment_weights_from_outline(outline)
        by_name = {r.name: r.due_date for r in rows}
        assert by_name["Final Exam"] is None
        assert by_name["P1"] is None
        assert by_name["Assignment"] == "2026-06-15"
        assert by_name["Quiz"] == "2026-06-01T10:00:00Z"
        assert by_name["Lab"] is None


class TestMergeAssessmentWeights:
    """_merge_assessment_weights handles all empty-Canvas / zero-weight scenarios."""

    @staticmethod
    def _aw(name: str, weight: float) -> AssessmentWeightResponse:
        return AssessmentWeightResponse(
            name=name,
            weight=weight,
            score=None,
            max_score=100.0,
            status="upcoming",
            group_name=name,
        )

    def test_no_grades_returns_outline(self) -> None:
        outline_rows = [self._aw("Final", 50.0), self._aw("A1", 20.0)]
        merged = _merge_assessment_weights([], outline_rows)
        assert merged == outline_rows

    def test_zero_weight_grades_fall_back_to_outline(self) -> None:
        grade_rows = [self._aw("Placeholder", 0.0)]
        outline_rows = [self._aw("Final", 50.0), self._aw("A1", 20.0)]
        merged = _merge_assessment_weights(grade_rows, outline_rows)
        assert [r.name for r in merged] == ["Final", "A1"]

    def test_normal_grades_prefer_canvas_append_new_outline(self) -> None:
        grade_rows = [self._aw("Final", 50.0)]
        outline_rows = [
            self._aw("Final", 50.0),
            self._aw("A1", 20.0),
            self._aw("Quiz", 10.0),
        ]
        merged = _merge_assessment_weights(grade_rows, outline_rows)
        names = [r.name for r in merged]
        assert names.count("Final") == 1, "Final must not duplicate across sources"
        assert "A1" in names
        assert "Quiz" in names
        assert len(merged) == 3

    def test_empty_outline_returns_grades_unchanged(self) -> None:
        grade_rows = [self._aw("Only Canvas", 30.0)]
        merged = _merge_assessment_weights(grade_rows, [])
        assert merged == grade_rows

    def test_name_match_is_case_insensitive(self) -> None:
        grade_rows = [self._aw("Final Exam", 50.0)]
        outline_rows = [self._aw("FINAL EXAM", 50.0), self._aw("A1", 20.0)]
        merged = _merge_assessment_weights(grade_rows, outline_rows)
        assert [r.name for r in merged] == ["Final Exam", "A1"]


class TestLatestUnitOutline:
    """_latest_unit_outline picks the most recent outline row by fetched_at."""

    def test_returns_none_for_empty(self) -> None:
        course = MagicMock()
        course.unit_outlines = []
        assert _latest_unit_outline(course) is None

    def test_picks_most_recent_fetched_at(self) -> None:
        older = _fake_outline([], fetched_at=datetime(2026, 1, 1, tzinfo=UTC))
        newer = _fake_outline([], fetched_at=datetime(2026, 3, 1, tzinfo=UTC))
        course = MagicMock()
        course.unit_outlines = [older, newer]
        assert _latest_unit_outline(course) is newer

    def test_handles_missing_fetched_at(self) -> None:
        no_date = _fake_outline([], fetched_at=None)
        with_date = _fake_outline([], fetched_at=datetime(2026, 3, 1, tzinfo=UTC))
        course = MagicMock()
        course.unit_outlines = [no_date, with_date]
        assert _latest_unit_outline(course) is with_date
