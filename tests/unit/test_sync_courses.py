"""Unit tests for sync_all_courses -- SYNC-FIX-05 shell-course filtering.

Stubs created in Wave 0 (Plan 32.1-00). Wave 1 (Plan 32.1-01) flipped xfail to
strict-green once ``_is_shell_course`` filter landed in ``course_linking``.
"""
from __future__ import annotations

import json
from pathlib import Path

from src.services.course_linking import link_courses

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


def test_filters_final_exam_shells() -> None:
    """Canvas courses matching 'Final Exam for:' or 'Concession' must be filtered out."""
    canvas_courses = json.loads((FIXTURES / "courses_with_shell.json").read_text())
    # After Wave 1 implements _is_shell_course filter, only COMP2017 should remain.
    result = link_courses(canvas_courses, ed_courses=[])
    names = [r.canvas_name for r in result]
    assert all("Final Exam for:" not in n for n in names)
    assert all("Concession" not in n for n in names)
    assert len(result) == 1
    assert result[0].canvas_name == "COMP2017 Systems Programming"


def test_real_courses_pass_through() -> None:
    """A list containing only real courses must pass through the filter unchanged."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 69855, "name": "COMP2017 Systems Programming (2026 Semester 1)"},
        {"id": 69981, "name": "EDGU1003 Diet and Nutrition (2026 Semester 1)"},
        {"id": 70123, "name": "MATH2021 Vector Calculus (2026 Semester 1)"},
    ]
    result = link_courses(canvas_courses, ed_courses=[])
    assert len(result) == 3
    canvas_ids = {r.canvas_course_id for r in result}
    assert canvas_ids == {"69855", "69981", "70123"}


def test_concession_case_insensitive() -> None:
    """Concession match must be case-insensitive across upper/lower/mixed variants."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 200001, "name": "CONCESSION ASSESSMENT FOR COMP2017"},
        {"id": 200002, "name": "concession assessment for comp3221"},
        {"id": 200003, "name": "Concession Make-up Test -- INFO1110"},
        {"id": 200004, "name": "COMP2017 Systems Programming (2026 Semester 1)"},
        {"id": 200005, "name": "Supplementary Exam COMP3221"},
        {"id": 200006, "name": "supplementary assessment INFO1110"},
        {"id": 200007, "name": "Final Exam for: MATH2021"},
        {"id": 200008, "name": "FINAL EXAM FOR: COMP3221"},
    ]
    result = link_courses(canvas_courses, ed_courses=[])
    assert len(result) == 1
    assert result[0].canvas_course_id == "200004"
