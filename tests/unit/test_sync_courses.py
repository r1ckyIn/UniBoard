"""Unit tests for sync_all_courses — SYNC-FIX-05 shell-course filtering.

Stubs created in Wave 0 (Plan 32.1-00). Wave 1 (Plan 32.1-01) flips xfail to strict.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.services.course_linking import link_courses

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


@pytest.mark.xfail(reason="Wave 1: SYNC-FIX-05 shell filter not implemented yet", strict=False)
def test_filters_final_exam_shells() -> None:
    """Canvas courses matching 'Final Exam for:' or 'Concession' must be filtered out."""
    canvas_courses = json.loads((FIXTURES / "courses_with_shell.json").read_text())
    # After Wave 1 implements _is_shell_course filter, only COMP2017 should remain.
    result = link_courses(canvas_courses, ed_courses=[], user_id=None)  # type: ignore[arg-type]
    names = [r.name for r in result]
    assert all("Final Exam for:" not in n for n in names)
    assert all("Concession" not in n for n in names)
    assert len(result) == 1
