"""Unit tests for course_linking single-candidate fallback — SYNC-FIX-03.

Stubs created in Wave 0. Wave 3 (Plan 32.1-05) adds the fallback logic.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.services.course_linking import link_courses

FIXTURES_CANVAS = Path(__file__).parent.parent / "fixtures" / "canvas"
FIXTURES_ED = Path(__file__).parent.parent / "fixtures" / "ed"


@pytest.mark.xfail(reason="Wave 3: single-candidate semester fallback not implemented", strict=False)
def test_single_candidate_fallback() -> None:
    """When Ed course has no extractable semester but the course code matches exactly
    one Canvas course, link them (single-candidate fallback).
    """
    canvas_courses = [
        {"id": 111111, "name": "COMP2017 Systems Programming", "course_code": "COMP2017", "enrollment_term_id": 42},
        {"id": 222222, "name": "EDGU1003 Academic Communication", "course_code": "EDGU1003", "enrollment_term_id": 42},
    ]
    ed_courses = json.loads((FIXTURES_ED / "courses_no_semester.json").read_text())
    # COMP2017 and EDGU1003 in Ed have no semester; fallback should link them.
    result = link_courses(canvas_courses, ed_courses, user_id=None)  # type: ignore[arg-type]
    by_code = {r.code: r for r in result}
    assert by_code["COMP2017"].ed_course_id == "50001"
    assert by_code["EDGU1003"].ed_course_id == "50003"
