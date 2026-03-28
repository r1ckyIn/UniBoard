"""Integration tests for PostgreSQL tsvector full-text search."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.lesson import Lesson
from src.models.module import Module, ModuleItem
from src.models.user import Profile as User
from src.security.password import hash_password
from src.services.materials import CourseMaterialService


@pytest_asyncio.fixture(loop_scope="session")
async def _search_data(session: AsyncSession) -> dict[str, object]:
    """Seed user, course, module items and lessons for search tests."""
    user = User(
        email=f"search-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Search Test",
    )
    session.add(user)
    await session.flush()

    course = Course(
        user_id=user.id,
        name="Advanced Algorithms",
        code="COMP2017",
        semester="2026S1",
    )
    session.add(course)
    await session.flush()

    module = Module(
        course_id=course.id,
        canvas_module_id="mod-1",
        name="Week 1",
        position=0,
    )
    session.add(module)
    await session.flush()

    # Module items with searchable titles
    item1 = ModuleItem(
        module_id=module.id,
        title="Algorithm Design Notes",
        type="File",
    )
    item2 = ModuleItem(
        module_id=module.id,
        title="COMP2017 Week 1 Slides",
        type="File",
    )
    item3 = ModuleItem(
        module_id=module.id,
        title="Introduction to Data Structures",
        type="Page",
    )
    session.add_all([item1, item2, item3])
    await session.flush()

    # Lesson with searchable text_content
    lesson = Lesson(
        course_id=course.id,
        ed_lesson_id="lesson-1",
        title="Binary Trees Overview",
        text_content=(
            "This lesson covers binary search tree operations "
            "including insertion deletion and traversal"
        ),
    )
    session.add(lesson)
    await session.flush()

    return {
        "user_id": user.id,
        "course_id": course.id,
        "module_id": module.id,
        "item1_id": item1.id,
        "item2_id": item2.id,
        "item3_id": item3.id,
        "lesson_id": lesson.id,
    }


@pytest.mark.asyncio(loop_scope="session")
async def test_tsvector_search_module_item(
    session: AsyncSession,
    _search_data: dict[str, object],
) -> None:
    """Search for 'algorithm' should match 'Algorithm Design Notes'."""
    svc = CourseMaterialService(session)
    result = await svc.search(_search_data["user_id"], "algorithm")  # type: ignore[arg-type]
    assert result.total_hits >= 1
    titles = [h.title for h in result.results]
    assert any("Algorithm" in t for t in titles)


@pytest.mark.asyncio(loop_scope="session")
async def test_tsvector_search_lesson_content(
    session: AsyncSession,
    _search_data: dict[str, object],
) -> None:
    """Search for 'binary search' should match lesson with that content."""
    svc = CourseMaterialService(session)
    result = await svc.search(_search_data["user_id"], "binary search")  # type: ignore[arg-type]
    assert result.total_hits >= 1
    types = [h.type for h in result.results]
    assert "lesson" in types


@pytest.mark.asyncio(loop_scope="session")
async def test_tsvector_search_course_code(
    session: AsyncSession,
    _search_data: dict[str, object],
) -> None:
    """Search for 'COMP2017' should match module item with that code in title."""
    svc = CourseMaterialService(session)
    result = await svc.search(_search_data["user_id"], "COMP2017")  # type: ignore[arg-type]
    assert result.total_hits >= 1
    titles = [h.title for h in result.results]
    assert any("COMP2017" in t for t in titles)


@pytest.mark.asyncio(loop_scope="session")
async def test_tsvector_search_no_results(
    session: AsyncSession,
    _search_data: dict[str, object],
) -> None:
    """Search for nonexistent term should return empty results."""
    svc = CourseMaterialService(session)
    result = await svc.search(_search_data["user_id"], "nonexistent_xyz_12345")  # type: ignore[arg-type]
    assert result.total_hits == 0
    assert result.results == []


@pytest.mark.asyncio(loop_scope="session")
async def test_ts_headline_snippet(
    session: AsyncSession,
    _search_data: dict[str, object],
) -> None:
    """Search results should contain <b>highlighted</b> terms in snippet."""
    svc = CourseMaterialService(session)
    result = await svc.search(_search_data["user_id"], "algorithm")  # type: ignore[arg-type]
    assert result.total_hits >= 1
    # At least one snippet should contain <b> tags
    has_highlight = any("<b>" in h.snippet for h in result.results)
    assert has_highlight, f"No highlighted snippets found: {[h.snippet for h in result.results]}"
