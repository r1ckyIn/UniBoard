"""Unit tests for src.sync.courses._flatten_ed_courses.

Protects the Ed /user enrolment normalisation path against the 2026-04-23
regression where Ed's nested ``{course: {...}}`` shape silently broke
course linking and left every enrolled course with ed_course_id=NULL.
"""

from __future__ import annotations

from src.services.course_linking import extract_course_code, extract_semester
from src.sync.courses import _flatten_ed_courses


def test_unwraps_nested_course_object() -> None:
    raw = [
        {
            "course": {
                "id": 31567,
                "code": "COMP2017",
                "name": "Systems Programming",
                "year": "2026",
                "session": "Semester 1",
                "status": "active",
            },
        }
    ]
    flat = _flatten_ed_courses(raw)
    assert len(flat) == 1
    assert flat[0]["id"] == 31567
    assert "COMP2017" in str(flat[0]["name"])
    assert "2026" in str(flat[0]["name"])
    assert "Semester 1" in str(flat[0]["name"])


def test_name_is_parseable_by_course_linking() -> None:
    """Synthesised name must yield both code and semester to the linker."""
    raw = [
        {
            "course": {
                "id": 30772,
                "code": "COMP3221",
                "name": "Distributed Systems",
                "year": "2026",
                "session": "Semester 1",
                "status": "active",
            },
        }
    ]
    flat = _flatten_ed_courses(raw)
    assert extract_course_code(str(flat[0]["name"])) == "COMP3221"
    assert extract_semester(str(flat[0]["name"])) == "2026-S1"


def test_drops_archived_courses() -> None:
    raw = [
        {
            "course": {
                "id": 20768,
                "code": "INFO1110",
                "name": "Intro to Programming",
                "year": "2025",
                "session": "Semester 1",
                "status": "archived",
            },
        },
        {
            "course": {
                "id": 31567,
                "code": "COMP2017",
                "name": "Systems Programming",
                "year": "2026",
                "session": "Semester 1",
                "status": "active",
            },
        },
    ]
    flat = _flatten_ed_courses(raw)
    assert len(flat) == 1
    assert flat[0]["id"] == 31567


def test_handles_flat_shape_for_back_compat() -> None:
    """Tolerates a flat ``{id, code, name, year, session}`` dict too so the
    helper can be reused in tests / migrations / alternative Ed endpoints."""
    raw = [
        {
            "id": 31567,
            "code": "COMP2017",
            "name": "Systems Programming",
            "year": "2026",
            "session": "Semester 1",
            "status": "active",
        }
    ]
    flat = _flatten_ed_courses(raw)
    assert len(flat) == 1
    assert flat[0]["id"] == 31567


def test_skips_entries_missing_code_or_id() -> None:
    raw = [
        {"course": {"id": 1, "code": "", "name": "missing code"}},
        {"course": {"id": "", "code": "COMP2017", "name": "missing id"}},
        {"course": {"id": 2, "code": "COMP9999", "name": "ok"}},
    ]
    flat = _flatten_ed_courses(raw)
    assert [f["id"] for f in flat] == [2]


def test_missing_session_falls_back_to_code_only() -> None:
    raw = [
        {"course": {"id": 1, "code": "COMP2017", "name": "Systems", "status": "active"}}
    ]
    flat = _flatten_ed_courses(raw)
    assert len(flat) == 1
    # link_courses' code-only fallback must still be able to extract the code
    assert extract_course_code(str(flat[0]["name"])) == "COMP2017"
