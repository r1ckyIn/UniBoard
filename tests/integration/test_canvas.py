"""Integration tests for CanvasAdapter against real Canvas API.

All tests skip if CANVAS_API_TOKEN is not set in the environment.
NO mocks -- pure integration testing per CONTEXT.md locked decision.
"""

import os

import pytest

from src.adapters.canvas import CanvasAdapter

CANVAS_TOKEN = os.environ.get("CANVAS_API_TOKEN")
CANVAS_COURSE_ID = "69855"  # COMP2017 from TRD SS11.1

pytestmark = pytest.mark.skipif(not CANVAS_TOKEN, reason="CANVAS_API_TOKEN not set")


@pytest.fixture
async def canvas() -> CanvasAdapter:
    """Create a CanvasAdapter with the real token."""
    assert CANVAS_TOKEN is not None
    adapter = CanvasAdapter(api_token=CANVAS_TOKEN)
    yield adapter  # type: ignore[misc]
    await adapter.close()


async def test_get_courses(canvas: CanvasAdapter) -> None:
    """Verify get_courses returns at least one course with expected keys."""
    courses = await canvas.get_courses()
    assert isinstance(courses, list)
    assert len(courses) >= 1
    for course in courses:
        assert "id" in course
        assert "name" in course


async def test_get_grades(canvas: CanvasAdapter) -> None:
    """Verify get_grades returns enrollment data for a known course."""
    grades = await canvas.get_grades(CANVAS_COURSE_ID)
    assert isinstance(grades, list)
    # Enrollment data should exist for a course the user is enrolled in
    assert len(grades) >= 1


async def test_get_assignments(canvas: CanvasAdapter) -> None:
    """Verify get_assignments returns assignment list with expected keys."""
    assignments = await canvas.get_assignments(CANVAS_COURSE_ID)
    assert isinstance(assignments, list)
    if len(assignments) > 0:
        for a in assignments:
            assert "id" in a
            assert "name" in a


async def test_get_modules_with_items(canvas: CanvasAdapter) -> None:
    """Verify get_modules returns modules with items key (include[]=items)."""
    modules = await canvas.get_modules(CANVAS_COURSE_ID)
    assert isinstance(modules, list)
    assert len(modules) >= 1
    # At least one module should have items populated (proving include[]=items works)
    has_items = any("items" in m for m in modules)
    assert has_items, "No module has 'items' key -- include[]=items may not be working"


async def test_validate_token(canvas: CanvasAdapter) -> None:
    """Verify validate_token returns True for a valid token."""
    result = await canvas.validate_token()
    assert result is True


async def test_validate_token_invalid() -> None:
    """Verify validate_token returns False for an invalid token."""
    adapter = CanvasAdapter(api_token="invalid-token-xxx")
    try:
        result = await adapter.validate_token()
        assert result is False
    finally:
        await adapter.close()


async def test_rate_limiter_updates_from_headers(canvas: CanvasAdapter) -> None:
    """Verify rate limiter remaining is updated after a real API call."""
    # Make a request to trigger header reading
    await canvas.get_courses()
    # After a successful request, remaining should be a positive float
    assert canvas._rate_limiter.remaining > 0


async def test_pagination(canvas: CanvasAdapter) -> None:
    """Verify pagination produces a flat list (Link header followed if multi-page)."""
    courses = await canvas.get_courses()
    assert isinstance(courses, list)
    # All items should be dicts (flat list, not nested pages)
    for course in courses:
        assert isinstance(course, dict)
