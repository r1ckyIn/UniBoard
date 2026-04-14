"""Unit tests for course_linking single-candidate fallback — SYNC-FIX-03.

Wave 3 (Plan 32.1-05) flips the Wave 0 xfail stub and adds edge-case coverage
around the single-candidate semester fallback in ``link_courses``.
"""
from __future__ import annotations

import json
from pathlib import Path

from src.services.course_linking import link_courses

FIXTURES_CANVAS = Path(__file__).parent.parent / "fixtures" / "canvas"
FIXTURES_ED = Path(__file__).parent.parent / "fixtures" / "ed"


def test_single_candidate_fallback() -> None:
    """When Ed course has no extractable semester but its course code appears in
    exactly one Canvas course, the two are linked (single-candidate fallback).

    Fixture ``courses_no_semester.json`` contains:
      - id=50001 COMP2017 Systems Programming         (no semester -> candidate)
      - id=50002 COMP3221 2026 Semester 1             (has semester -> primary index)
      - id=50003 EDGU1003 Academic Communication      (no semester -> candidate)
      - id=50004 INFO1110 Semester 1 2026             (has semester -> primary index)
    """
    canvas_courses: list[dict[str, object]] = [
        {
            "id": 111111,
            "name": "COMP2017 Systems Programming (2026 Semester 1)",
        },
        {
            "id": 222222,
            "name": "EDGU1003 Academic Communication (2026 Semester 1)",
        },
    ]
    ed_courses = json.loads((FIXTURES_ED / "courses_no_semester.json").read_text())

    results = link_courses(canvas_courses, ed_courses)
    by_code = {r.course_code: r for r in results if r.canvas_course_id}

    assert by_code["COMP2017"].ed_course_id == "50001"
    assert by_code["COMP2017"].is_linked is True
    assert by_code["EDGU1003"].ed_course_id == "50003"
    assert by_code["EDGU1003"].is_linked is True


def test_multiple_candidates_not_linked() -> None:
    """When Ed has multiple no-semester courses for the same code, none are linked
    (ambiguous — logged and skipped).
    """
    canvas_courses: list[dict[str, object]] = [
        {
            "id": 111111,
            "name": "COMP2017 Systems Programming (2026 Semester 1)",
        },
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 50001, "name": "COMP2017 Systems Programming"},
        {"id": 50005, "name": "COMP2017 Systems Programming (Archive)"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    canvas_result = next(r for r in results if r.canvas_course_id == "111111")
    assert canvas_result.ed_course_id is None
    assert canvas_result.is_linked is False


def test_primary_match_wins_over_fallback() -> None:
    """Primary (code, semester) match takes precedence over the single-candidate
    fallback when both candidates exist.
    """
    canvas_courses: list[dict[str, object]] = [
        {
            "id": 111111,
            "name": "COMP2017 Systems Programming (2026 Semester 1)",
        },
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 50001, "name": "COMP2017 Systems Programming"},
        {"id": 60001, "name": "COMP2017 (2026 Semester 1)"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    canvas_result = next(r for r in results if r.canvas_course_id == "111111")
    # Primary match wins: ed_course_id is the semester-tagged Ed course, not the
    # no-semester fallback candidate.
    assert canvas_result.ed_course_id == "60001"
    assert canvas_result.is_linked is True


def test_no_candidates_leaves_unlinked() -> None:
    """When Ed has no courses at all for a given code, the Canvas course stays
    unlinked (existing behavior, no fallback triggered).
    """
    canvas_courses: list[dict[str, object]] = [
        {
            "id": 111111,
            "name": "COMP2017 Systems Programming (2026 Semester 1)",
        },
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 50003, "name": "EDGU1003 Academic Communication"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    canvas_result = next(r for r in results if r.canvas_course_id == "111111")
    assert canvas_result.ed_course_id is None
    assert canvas_result.is_linked is False
