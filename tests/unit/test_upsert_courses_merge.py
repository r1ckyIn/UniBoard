"""Unit tests for _upsert_courses legacy-row merge semantics.

Protects against the 2026-04-23 regression where PR #111 turned every
pre-fix Canvas-no-semester row ('' semester) into an orphan and PR #112
then wrote a parallel populated row, giving the frontend two COMP2017
records -- one with the bookmarked UUID and ed=null, one fresh with
ed=31567. _upsert_courses must merge the new LinkedCourse into the
legacy row, not create a duplicate.

Uses AsyncMock over a fake session instead of a real DB to keep the
test suite offline-compatible and independent of the Postgres pgvector
fixture.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.course_linking import LinkedCourse
from src.sync.courses import _upsert_courses


@dataclass
class FakeCourse:
    """Stand-in for the Course ORM model. Carries just the fields that
    _upsert_courses reads or mutates so we do not need real SQLAlchemy."""

    user_id: uuid.UUID
    code: str
    semester: str = ""
    name: str = ""
    canvas_course_id: str | None = None
    ed_course_id: str | None = None
    unit_outline_url: str | None = None
    id: uuid.UUID | None = None

    def __post_init__(self) -> None:
        if self.id is None:
            self.id = uuid.uuid4()


def _make_session(
    existing_rows: list[FakeCourse],
) -> tuple[MagicMock, list[Any]]:
    """Return (session, added_rows) where the session's execute() resolves
    SELECT Course WHERE ... expressions against ``existing_rows``.

    Resolves any WHERE clause of the form ``col == literal`` or
    ``col.is_(None)`` by reading each BinaryExpression's left-column name
    and comparing against the attribute of the same name on each stored
    FakeCourse. That covers all patterns _upsert_courses uses:

    - ``where(user_id, code)`` -> scalars().all()
    - ``where(user_id, code, semester)`` -> scalars().all()
    - ``where(user_id, canvas_course_id.is_(None))`` -> scalars().all()
      (zombie-row purge at the end of _upsert_courses)
    """
    added: list[Any] = []

    def _match_rows(stmt: Any) -> list[FakeCourse]:
        filters: dict[str, Any] = {}
        for clause in stmt.whereclause.clauses:
            col_name = clause.left.name
            # `col == value` exposes `.right.value`; `col.is_(None)` produces
            # a Null literal without that attribute -- treat as None.
            try:
                filters[col_name] = clause.right.value
            except AttributeError:
                filters[col_name] = None
        return [
            r
            for r in existing_rows
            if all(getattr(r, k) == v for k, v in filters.items())
        ]

    async def _execute(stmt: Any) -> MagicMock:
        matched = _match_rows(stmt)
        result = MagicMock()
        result.scalar_one_or_none = MagicMock(
            return_value=matched[0] if matched else None
        )
        scalars = MagicMock()
        scalars.all = MagicMock(return_value=list(matched))
        result.scalars = MagicMock(return_value=scalars)
        return result

    def _add(obj: Any) -> None:
        added.append(obj)
        existing_rows.append(obj)

    async def _delete(obj: Any) -> None:
        if obj in existing_rows:
            existing_rows.remove(obj)

    session = MagicMock()
    session.execute = AsyncMock(side_effect=_execute)
    session.add = MagicMock(side_effect=_add)
    session.delete = AsyncMock(side_effect=_delete)
    session.flush = AsyncMock()
    return session, added


@pytest.mark.asyncio
async def test_merges_legacy_blank_semester_row_instead_of_duplicating() -> None:
    """Pre-#111 row carries semester=''. New LinkedCourse arrives with
    semester='2026-S1'. Must update the existing row rather than insert
    a second record."""
    user_id = uuid.uuid4()
    legacy = FakeCourse(
        user_id=user_id,
        code="COMP2017",
        semester="",
        name="COMP2017 COMP9017 Systems Programming",
        canvas_course_id="69855",
        ed_course_id=None,
    )
    rows = [legacy]
    session, added = _make_session(rows)

    linked = [
        LinkedCourse(
            course_code="COMP2017",
            semester="2026-S1",
            canvas_course_id="69855",
            ed_course_id="31567",
            canvas_name="COMP2017 COMP9017 Systems Programming",
            ed_name="COMP2017 (2026 Semester 1)",
            is_linked=True,
        )
    ]

    await _upsert_courses(session, user_id, linked, adapter=None)

    assert added == []  # no new row
    assert len(rows) == 1
    assert rows[0].id == legacy.id  # same PK -> bookmarked UUIDs survive
    assert rows[0].ed_course_id == "31567"
    assert rows[0].semester == "2026-S1"


@pytest.mark.asyncio
async def test_skips_ed_only_linked_courses() -> None:
    """link_courses adds unmatched Ed courses to results. Those have no
    canvas_course_id and must not create user-visible Course rows."""
    user_id = uuid.uuid4()
    rows: list[FakeCourse] = []
    session, added = _make_session(rows)

    linked = [
        LinkedCourse(
            course_code="COMP2123",
            semester="2025-S1",
            canvas_course_id=None,
            ed_course_id="24579",
            ed_name="COMP2123 (2025 Semester 1)",
            is_linked=False,
        ),
    ]

    await _upsert_courses(session, user_id, linked, adapter=None)
    assert added == []
    assert rows == []


@pytest.mark.asyncio
async def test_canvas_match_wins_over_blank_semester_when_multiple_legacy() -> None:
    """If two legacy rows exist (e.g. code='COMP2017' semester='' AND
    semester='2025-S2'), and the new LinkedCourse points at the canvas_id
    that one of them carries, merge into that one."""
    user_id = uuid.uuid4()
    other = FakeCourse(
        user_id=user_id,
        code="COMP2017",
        semester="2025-S2",
        name="COMP2017 (archive)",
        canvas_course_id="55555",
        ed_course_id=None,
    )
    target = FakeCourse(
        user_id=user_id,
        code="COMP2017",
        semester="",
        name="COMP2017 COMP9017 Systems Programming",
        canvas_course_id="69855",
        ed_course_id=None,
    )
    rows = [other, target]
    session, added = _make_session(rows)

    linked = [
        LinkedCourse(
            course_code="COMP2017",
            semester="2026-S1",
            canvas_course_id="69855",
            ed_course_id="31567",
            canvas_name="COMP2017 COMP9017 Systems Programming",
            ed_name="COMP2017 (2026 Semester 1)",
            is_linked=True,
        )
    ]

    await _upsert_courses(session, user_id, linked, adapter=None)
    assert added == []  # still no new row -- merged into target
    merged = next(r for r in rows if r.canvas_course_id == "69855")
    assert merged.ed_course_id == "31567"
    assert merged.semester == "2026-S1"
    # `other` row untouched
    untouched = next(r for r in rows if r.canvas_course_id == "55555")
    assert untouched.ed_course_id is None
    assert untouched.semester == "2025-S2"


@pytest.mark.asyncio
async def test_cleans_up_duplicate_rows_preserving_bookmarked_uuid() -> None:
    """Pipeline snapshot after 2026-04-23: a blank-semester legacy row
    (frontend-bookmarked, ed=null) coexists with a populated duplicate
    (ed=31567). A subsequent sync must merge the populated one INTO the
    legacy row (PK stays stable), then delete the duplicate."""
    user_id = uuid.uuid4()
    legacy = FakeCourse(
        user_id=user_id,
        code="COMP2017",
        semester="",
        name="COMP2017 COMP9017 Systems Programming",
        canvas_course_id="69855",
        ed_course_id=None,
    )
    duplicate = FakeCourse(
        user_id=user_id,
        code="COMP2017",
        semester="2026-S1",
        name="COMP2017 (2026 Semester 1)",
        canvas_course_id="69855",
        ed_course_id="31567",
    )
    rows = [legacy, duplicate]
    session, added = _make_session(rows)

    linked = [
        LinkedCourse(
            course_code="COMP2017",
            semester="2026-S1",
            canvas_course_id="69855",
            ed_course_id="31567",
            canvas_name="COMP2017 COMP9017 Systems Programming",
            ed_name="COMP2017 (2026 Semester 1)",
            is_linked=True,
        )
    ]

    await _upsert_courses(session, user_id, linked, adapter=None)

    assert added == []  # no new row
    # duplicate removed, legacy kept
    remaining = [r for r in rows if r.code == "COMP2017"]
    assert len(remaining) == 1
    assert remaining[0].id == legacy.id  # bookmark UUID preserved
    assert remaining[0].ed_course_id == "31567"
    assert remaining[0].semester == "2026-S1"


@pytest.mark.asyncio
async def test_fresh_install_creates_new_row() -> None:
    """With no prior rows, a linked course creates a populated record."""
    user_id = uuid.uuid4()
    rows: list[FakeCourse] = []
    session, added = _make_session(rows)

    linked = [
        LinkedCourse(
            course_code="COMP2017",
            semester="2026-S1",
            canvas_course_id="69855",
            ed_course_id="31567",
            canvas_name="COMP2017 (2026 Semester 1)",
            ed_name="COMP2017 (2026 Semester 1)",
            is_linked=True,
        )
    ]

    await _upsert_courses(session, user_id, linked, adapter=None)
    assert len(added) == 1
    created = added[0]
    assert created.canvas_course_id == "69855"
    assert created.ed_course_id == "31567"
    assert created.semester == "2026-S1"


@pytest.mark.asyncio
async def test_purges_stale_null_canvas_rows() -> None:
    """Pre-#113 zombie rows (canvas_course_id=None) must be deleted at the
    end of _upsert_courses, while current-user Canvas-linked rows stay and
    rows belonging to other users are untouched."""
    user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()

    zombie = FakeCourse(
        user_id=user_id,
        code="COMP2123",
        semester="2025-S1",
        name="COMP2123 Data Structures",
        canvas_course_id=None,
        ed_course_id="24579",
    )
    existing_canvas = FakeCourse(
        user_id=user_id,
        code="COMP2017",
        semester="2026-S1",
        name="COMP2017 Systems Programming",
        canvas_course_id="69855",
        ed_course_id="31567",
    )
    other_users_zombie = FakeCourse(
        user_id=other_user_id,
        code="INFO1113",
        semester="",
        name="INFO1113 OOP",
        canvas_course_id=None,
        ed_course_id="11111",
    )
    rows = [zombie, existing_canvas, other_users_zombie]
    session, _ = _make_session(rows)

    linked = [
        LinkedCourse(
            course_code="COMP2017",
            semester="2026-S1",
            canvas_course_id="69855",
            ed_course_id="31567",
            canvas_name="COMP2017 Systems Programming",
            ed_name="COMP2017 (2026 Semester 1)",
            is_linked=True,
        )
    ]

    await _upsert_courses(session, user_id, linked, adapter=None)

    session.delete.assert_any_call(zombie)
    assert zombie not in rows  # purged
    assert existing_canvas in rows  # Canvas-linked row survives
    assert other_users_zombie in rows  # other user's data untouched


@pytest.mark.asyncio
async def test_purges_zombie_even_when_no_linked_courses() -> None:
    """Edge case: user has a zombie row but nothing to upsert this tick
    (empty linked list). The purge must still run -- otherwise the zombie
    only clears on syncs that happen to bring a Canvas course."""
    user_id = uuid.uuid4()
    zombie = FakeCourse(
        user_id=user_id,
        code="COMP2123",
        semester="",
        name="COMP2123",
        canvas_course_id=None,
        ed_course_id="24579",
    )
    rows = [zombie]
    session, added = _make_session(rows)

    await _upsert_courses(session, user_id, linked=[], adapter=None)

    assert added == []  # no new rows from empty input
    session.delete.assert_awaited_once_with(zombie)
    assert zombie not in rows
