"""Integration tests for course linking logic.

These tests work entirely offline -- no API tokens required.
Tests the regex-based course code extraction and cross-platform matching.
"""

import json
from pathlib import Path

from src.services.course_linking import (
    LinkedCourse,
    extract_course_code,
    extract_semester,
    link_courses,
)

FIXTURES = Path(__file__).parent.parent / "fixtures" / "canvas"


async def test_extract_course_code_standard() -> None:
    """Verify standard course code extraction."""
    assert extract_course_code("COMP2017 Systems Programming") == "COMP2017"


async def test_extract_course_code_with_extra() -> None:
    """Verify extraction from name with semester info."""
    assert (
        extract_course_code("COMP3221 Distributed Systems (2026 S1)")
        == "COMP3221"
    )


async def test_extract_course_code_missing() -> None:
    """Verify None returned when no course code found."""
    assert extract_course_code("General Studies") is None


async def test_extract_course_code_edge_cases() -> None:
    """Test edge cases for course code extraction."""
    assert extract_course_code("EDGU1003 Diet and Nutrition") == "EDGU1003"
    assert extract_course_code("MATH2021 Vector Calculus") == "MATH2021"
    assert extract_course_code("STAT2011 Probability") == "STAT2011"
    # Should not match lowercase
    assert extract_course_code("comp2017 systems") is None
    # Should not match partial codes
    assert extract_course_code("COM201 short") is None


async def test_extract_semester_various_formats() -> None:
    """Test various semester patterns that Canvas/Ed might use."""
    assert extract_semester("COMP2017 (2026 Semester 1)") == "2026-S1"
    assert extract_semester("COMP3221 2026-S1") == "2026-S1"
    assert extract_semester("S1 2026 COMP2017") == "2026-S1"
    assert extract_semester("COMP2017 2026 Sem 2") == "2026-S2"
    assert extract_semester("COMP2017 2026 S1") == "2026-S1"


async def test_extract_semester_missing() -> None:
    """Verify None returned when no semester pattern found."""
    assert extract_semester("COMP2017 Systems Programming") is None


async def test_link_courses_matching() -> None:
    """Verify courses match by code + semester composite key."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 69855, "name": "COMP2017 Systems Programming (2026 Semester 1)"},
        {"id": 69874, "name": "COMP3221 Distributed Systems (2026 Semester 1)"},
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 31567, "name": "COMP2017 (2026 Semester 1)"},
        {"id": 30772, "name": "COMP3221 (2026 Semester 1)"},
    ]

    results = link_courses(canvas_courses, ed_courses)

    linked = [r for r in results if r.is_linked]
    assert len(linked) == 2

    comp2017 = next(r for r in linked if r.course_code == "COMP2017")
    assert comp2017.canvas_course_id == "69855"
    assert comp2017.ed_course_id == "31567"
    assert comp2017.is_linked is True

    comp3221 = next(r for r in linked if r.course_code == "COMP3221")
    assert comp3221.canvas_course_id == "69874"
    assert comp3221.ed_course_id == "30772"


async def test_link_courses_unmatched() -> None:
    """Verify Canvas courses without Ed match produce unlinked entries."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 69981, "name": "EDGU1003 Diet and Nutrition (2026 Semester 1)"},
    ]
    ed_courses: list[dict[str, object]] = []

    results = link_courses(canvas_courses, ed_courses)
    assert len(results) == 1
    assert results[0].canvas_course_id == "69981"
    assert results[0].ed_course_id is None
    assert results[0].is_linked is False


async def test_link_courses_ed_only() -> None:
    """Verify Ed courses without Canvas match produce unlinked entries."""
    canvas_courses: list[dict[str, object]] = []
    ed_courses: list[dict[str, object]] = [
        {"id": 31567, "name": "COMP2017 (2026 Semester 1)"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    assert len(results) == 1
    assert results[0].ed_course_id == "31567"
    assert results[0].canvas_course_id is None
    assert results[0].is_linked is False


async def test_link_courses_mixed() -> None:
    """Verify mixed matching, unmatched, and Ed-only courses."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 69855, "name": "COMP2017 (2026 Semester 1)"},
        {"id": 69981, "name": "EDGU1003 (2026 Semester 1)"},
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 31567, "name": "COMP2017 (2026 Semester 1)"},
        {"id": 99999, "name": "COMP9999 (2026 Semester 1)"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    linked = [r for r in results if r.is_linked]
    unlinked = [r for r in results if not r.is_linked]

    assert len(linked) == 1
    assert linked[0].course_code == "COMP2017"

    # EDGU1003 (canvas-only) + COMP9999 (ed-only) = 2 unlinked
    assert len(unlinked) == 2


async def test_linked_course_dataclass() -> None:
    """Verify LinkedCourse dataclass defaults."""
    lc = LinkedCourse(course_code="COMP2017", semester="2026-S1")
    assert lc.canvas_course_id is None
    assert lc.ed_course_id is None
    assert lc.canvas_name == ""
    assert lc.ed_name is None
    assert lc.is_linked is False


async def test_semester_fallback_integration() -> None:
    """SYNC-FIX-03: end-to-end check that a Canvas course with semester gets
    linked to an Ed course without extractable semester when the Ed course is
    the sole candidate for that course code (single-candidate fallback).
    """
    canvas_courses: list[dict[str, object]] = [
        {
            "id": 69855,
            "name": "COMP2017 Systems Programming (2026 Semester 1)",
        },
    ]
    # Ed course lacks semester in the name -> falls back via ed_code_only.
    ed_courses = json.loads(
        (Path(__file__).parent.parent / "fixtures" / "ed" / "courses_no_semester.json").read_text()
    )

    results = link_courses(canvas_courses, ed_courses)
    by_canvas = [r for r in results if r.canvas_course_id == "69855"]
    assert len(by_canvas) == 1
    assert by_canvas[0].ed_course_id == "50001"
    assert by_canvas[0].is_linked is True


async def test_canvas_no_semester_links_via_current_semester() -> None:
    """Canvas drops the '(2026 Semester 1)' suffix from its 2026 course feed,
    so ``extract_semester`` returns None for the Canvas side. The linker must
    still resolve against Ed by looking for the current semester tag on the
    Ed course name (the production regression that left all four enrolled
    courses with ed_course_id=null).
    """
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    current = f"{now.year}-S{'1' if now.month <= 6 else '2'}"
    sem_label = (
        f"{now.year} Semester 1" if now.month <= 6 else f"{now.year} Semester 2"
    )

    canvas_courses: list[dict[str, object]] = [
        # No semester token anywhere in the name -- the 2026 regression shape.
        {"id": 69855, "name": "COMP2017 COMP9017 Systems Programming"},
        {"id": 69874, "name": "COMP3221 Distributed Systems"},
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 31567, "name": f"COMP2017 ({sem_label})"},
        {"id": 30772, "name": f"COMP3221 ({sem_label})"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    linked = {r.course_code: r for r in results if r.is_linked}
    assert set(linked) == {"COMP2017", "COMP3221"}
    assert linked["COMP2017"].ed_course_id == "31567"
    assert linked["COMP3221"].ed_course_id == "30772"
    assert linked["COMP2017"].semester == current


async def test_canvas_no_semester_prefers_latest_ed_candidate() -> None:
    """When Canvas has no semester and multiple Ed candidates exist for the
    same code, pick the one with the highest YYYY-SN (most recent semester)."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 69855, "name": "COMP2017 Systems Programming"},
    ]
    # Two Ed candidates. YYYY-SN sorts lexicographically = chronologically,
    # so '2026-S1' beats '2025-S2'.
    ed_courses: list[dict[str, object]] = [
        {"id": 10001, "name": "COMP2017 (2025 Semester 2)"},
        {"id": 10002, "name": "COMP2017 (2026 Semester 1)"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    linked = [r for r in results if r.is_linked]
    assert len(linked) == 1
    assert linked[0].ed_course_id == "10002"
    assert linked[0].semester == "2026-S1"


async def test_canvas_no_semester_single_code_only_candidate() -> None:
    """When the Ed side also lacks a semester token, a single code-only
    candidate still resolves to a link. Matches the real fallback path for
    older Ed courses that never added the semester suffix."""
    canvas_courses: list[dict[str, object]] = [
        {"id": 69855, "name": "COMP2017 Systems Programming"},
    ]
    ed_courses: list[dict[str, object]] = [
        {"id": 31567, "name": "COMP2017 Systems Programming"},
    ]

    results = link_courses(canvas_courses, ed_courses)
    linked = [r for r in results if r.is_linked]
    assert len(linked) == 1
    assert linked[0].ed_course_id == "31567"


async def test_shell_courses_filtered_integration() -> None:
    """SYNC-FIX-05: end-to-end check that shell courses from the Wave 0 fixture
    are filtered by ``link_courses`` before any matching logic runs."""
    canvas_courses = json.loads(
        (FIXTURES / "courses_with_shell.json").read_text()
    )
    ed_courses: list[dict[str, object]] = [
        {"id": 31567, "name": "COMP2017 (2026 Semester 1)"},
    ]

    results = link_courses(canvas_courses, ed_courses)

    # Only real COMP2017 canvas course + one ed-only entry for unmatched semester.
    canvas_names = [r.canvas_name for r in results if r.canvas_name]
    assert all("Final Exam for:" not in n for n in canvas_names)
    assert all("Concession" not in n for n in canvas_names)
    # Exactly one canvas-origin entry survives the filter.
    assert len(canvas_names) == 1
    assert canvas_names[0] == "COMP2017 Systems Programming"
