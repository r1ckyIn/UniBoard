"""Cross-platform course matching: links Canvas and Ed courses by code + semester."""

import re
from dataclasses import dataclass
from datetime import UTC, datetime

import structlog


def _current_semester() -> str:
    """Return the current Sydney academic semester as ``YYYY-SN``.

    USYD runs S1 Feb-Jun and S2 Jul-Nov; July is the inflection month used
    across the repo (see src/sync/outlines.py for the mirror calculation).
    """
    now = datetime.now(UTC)
    return f"{now.year}-S{'1' if now.month <= 6 else '2'}"

logger = structlog.get_logger()

# Course code pattern: 4 uppercase letters + 4 digits (e.g. COMP2017)
_COURSE_CODE_RE = re.compile(r"[A-Z]{4}\d{4}")

# Canvas creates placeholder courses for final-exam re-sits, concession
# assessments and supplementary exams that duplicate the parent course. These
# shells pollute the user's course list and downstream grade/deadline/outline
# syncs, so drop them before any matching logic runs.
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
    """
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

    # Fallback index for Ed courses that omit the semester in their name.
    # Used only when the primary (code, semester) match misses and exactly
    # one candidate exists for the code.
    ed_code_only: dict[str, list[dict[str, object]]] = {}

    for ec in ed_courses:
        ed_name = str(ec.get("name", ""))
        code = extract_course_code(ed_name)
        semester = extract_semester(ed_name)
        if code and semester:
            key = (code, semester)
            ed_index[key] = ec
            ed_unmatched[key] = ec
        elif code and not semester:
            ed_code_only.setdefault(code, []).append(ec)

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

            # Primary match missed: fall back to the code-only index when
            # exactly one Ed course exists for this code without a semester
            # tag. More than one candidate is ambiguous (logged and skipped).
            if ed_match is None:
                candidates = ed_code_only.get(code, [])
                if len(candidates) == 1:
                    ed_match = candidates[0]
                    logger.info(
                        "course_linking_ambiguous_semester_fallback",
                        canvas_code=code,
                        ed_course_id=str(ed_match.get("id", "")),
                    )
                elif len(candidates) > 1:
                    logger.info(
                        "course_linking_ambiguous_semester_fallback_skipped",
                        canvas_code=code,
                        reason="multiple_candidates",
                        count=len(candidates),
                    )

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
        elif code:
            # Canvas has the course code but the name carries no semester
            # token (USYD's 2026 Canvas feed dropped the "2026 Semester 1"
            # suffix, which silently broke linking for every enrolled
            # course). Resolve against the Ed side:
            #   1. prefer an exact (code, current_semester) hit
            #   2. otherwise, if ed_index / ed_code_only have a single
            #      candidate for this code, link to it
            #   3. if multiple Ed candidates exist, pick the one with the
            #      most recent semester token (YYYY-SN sorts lexicographically
            #      = chronologically)
            current_sem = _current_semester()
            ed_match = ed_index.get((code, current_sem))
            matched_key: tuple[str, str] | None = (
                (code, current_sem) if ed_match is not None else None
            )

            if ed_match is None:
                all_with_sem = [
                    ((code, k[1]), v)
                    for k, v in ed_index.items()
                    if k[0] == code
                ]
                code_only = ed_code_only.get(code, [])

                if len(all_with_sem) == 1 and not code_only:
                    matched_key, ed_match = all_with_sem[0]
                elif len(all_with_sem) > 1:
                    # Pick the highest (YYYY-SN) -> most recent semester.
                    matched_key, ed_match = max(
                        all_with_sem, key=lambda pair: pair[0][1]
                    )
                elif len(code_only) == 1 and not all_with_sem:
                    ed_match = code_only[0]
                # else: ambiguous or no candidate -> stays unlinked.

            if ed_match is not None:
                ed_semester = (
                    matched_key[1] if matched_key is not None else ""
                )
                results.append(
                    LinkedCourse(
                        course_code=code,
                        semester=ed_semester,
                        canvas_course_id=canvas_id,
                        ed_course_id=str(ed_match.get("id", "")),
                        canvas_name=canvas_name,
                        ed_name=str(ed_match.get("name", "")),
                        is_linked=True,
                    )
                )
                if matched_key is not None:
                    matched_ed_keys.add(matched_key)
                logger.info(
                    "course_linking_canvas_no_semester_resolved",
                    canvas_code=code,
                    ed_semester=ed_semester,
                    ed_course_id=str(ed_match.get("id", "")),
                )
            else:
                results.append(
                    LinkedCourse(
                        course_code=code,
                        semester="",
                        canvas_course_id=canvas_id,
                        canvas_name=canvas_name,
                        is_linked=False,
                    )
                )
        else:
            # No code extractable: canvas-only, unlinked
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
