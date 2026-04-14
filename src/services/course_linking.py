"""Cross-platform course matching: links Canvas and Ed courses by code + semester."""

import re
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()

# Course code pattern: 4 uppercase letters + 4 digits (e.g. COMP2017)
_COURSE_CODE_RE = re.compile(r"[A-Z]{4}\d{4}")

# SYNC-FIX-05: Canvas concession-shell course patterns.
# Canvas creates placeholder courses for final-exam re-sits, concession assessments
# and supplementary exams that duplicate the parent course. These shells pollute
# the user's course list and downstream grade/deadline/outline syncs, so we drop
# them at the `link_courses` entry point before any matching logic runs.
_SHELL_COURSE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^final\s+exam\s+for:", re.IGNORECASE),
    re.compile(r"concession", re.IGNORECASE),
    re.compile(r"^supplementary", re.IGNORECASE),
]


def _is_shell_course(name: str) -> bool:
    """Return True if Canvas course name matches a known Canvas concession-shell pattern.

    Shell courses are Canvas-side placeholders for final-exam re-sits, concession
    assessments and supplementary exams that duplicate the parent course. They
    must be excluded from the user's course list.
    """
    return any(p.search(name) for p in _SHELL_COURSE_PATTERNS)

# Semester patterns used by Canvas/Ed course names
_SEMESTER_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(\d{4})\s*(?:Semester|Sem)\s*(\d)", re.IGNORECASE),
    re.compile(r"(\d{4})-S(\d)", re.IGNORECASE),
    re.compile(r"S(\d)\s*(\d{4})", re.IGNORECASE),
    re.compile(r"(\d{4})\s*S(\d)", re.IGNORECASE),
]


def extract_course_code(name: str) -> str | None:
    """Extract a USYD course code (e.g. COMP2017) from a course name string.

    Returns the first match or None if no code found.
    """
    match = _COURSE_CODE_RE.search(name)
    return match.group(0) if match else None


def extract_semester(name: str) -> str | None:
    """Extract a normalized semester string (YYYY-SN) from a course name.

    Recognizes patterns like '2026 Semester 1', '2026-S1', 'S1 2026'.
    Returns None if no semester pattern found.
    """
    for pattern in _SEMESTER_PATTERNS:
        match = pattern.search(name)
        if match:
            groups = match.groups()
            # Determine which group is year and which is semester number
            if len(groups[0]) == 4:
                year, sem_num = groups[0], groups[1]
            else:
                sem_num, year = groups[0], groups[1]
            return f"{year}-S{sem_num}"
    return None


@dataclass
class LinkedCourse:
    """A course potentially linked across Canvas and Ed platforms."""

    course_code: str
    semester: str
    canvas_course_id: str | None = None
    ed_course_id: str | None = None
    canvas_name: str = ""
    ed_name: str | None = None
    is_linked: bool = False


def link_courses(
    canvas_courses: list[dict[str, object]],
    ed_courses: list[dict[str, object]],
) -> list[LinkedCourse]:
    """Match Canvas and Ed courses by (course_code, semester) composite key.

    - Matched courses have both IDs populated and is_linked=True
    - Unmatched Canvas courses: ed_course_id=None, is_linked=False
    - Unmatched Ed courses: canvas_course_id=None, is_linked=False

    SYNC-FIX-05: Canvas concession-shell courses (Final Exam for:/Concession/
    Supplementary) are dropped up front so they never enter the matching index
    or appear in the user's course list.
    """
    # SYNC-FIX-05: Filter out Canvas concession shell courses.
    filtered_canvas: list[dict[str, object]] = []
    for c in canvas_courses:
        name = str(c.get("name", ""))
        if _is_shell_course(name):
            logger.info(
                "course_filtered_shell",
                canvas_course_id=str(c.get("id", "")),
                name=name,
            )
            continue
        filtered_canvas.append(c)
    canvas_courses = filtered_canvas

    # Index Ed courses by (code, semester)
    ed_index: dict[tuple[str, str], dict[str, object]] = {}
    ed_unmatched: dict[tuple[str, str], dict[str, object]] = {}

    for ec in ed_courses:
        ed_name = str(ec.get("name", ""))
        code = extract_course_code(ed_name)
        semester = extract_semester(ed_name)
        if code and semester:
            key = (code, semester)
            ed_index[key] = ec
            ed_unmatched[key] = ec

    results: list[LinkedCourse] = []
    matched_ed_keys: set[tuple[str, str]] = set()

    for cc in canvas_courses:
        canvas_name = str(cc.get("name", ""))
        code = extract_course_code(canvas_name)
        semester = extract_semester(canvas_name)
        canvas_id = str(cc.get("id", ""))

        if code and semester:
            key = (code, semester)
            ed_match = ed_index.get(key)
            if ed_match is not None:
                results.append(
                    LinkedCourse(
                        course_code=code,
                        semester=semester,
                        canvas_course_id=canvas_id,
                        ed_course_id=str(ed_match.get("id", "")),
                        canvas_name=canvas_name,
                        ed_name=str(ed_match.get("name", "")),
                        is_linked=True,
                    )
                )
                matched_ed_keys.add(key)
            else:
                results.append(
                    LinkedCourse(
                        course_code=code,
                        semester=semester,
                        canvas_course_id=canvas_id,
                        canvas_name=canvas_name,
                        is_linked=False,
                    )
                )
        else:
            # No code/semester extractable: canvas-only, unlinked
            results.append(
                LinkedCourse(
                    course_code=code or "",
                    semester=semester or "",
                    canvas_course_id=canvas_id,
                    canvas_name=canvas_name,
                    is_linked=False,
                )
            )

    # Add unmatched Ed courses
    for key, ec in ed_unmatched.items():
        if key not in matched_ed_keys:
            ed_name = str(ec.get("name", ""))
            results.append(
                LinkedCourse(
                    course_code=key[0],
                    semester=key[1],
                    ed_course_id=str(ec.get("id", "")),
                    ed_name=ed_name,
                    is_linked=False,
                )
            )

    return results
