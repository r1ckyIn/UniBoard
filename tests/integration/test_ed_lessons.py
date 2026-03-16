"""Integration tests for EdLessonsAdapter against real Ed API.

API-hitting tests skip if ED_API_TOKEN is not set in the environment.
NO mocks -- pure integration testing per CONTEXT.md locked decision.
Tests validate TRD SS9.4 field name corrections (content not passage, etc.).
"""

import os

import pytest

from src.adapters.ed_lessons import ED_FIELD_MAP, EdLessonsAdapter

ED_TOKEN = os.environ.get("ED_API_TOKEN")
ED_COURSE_ID = "31567"  # COMP2017 from TRD SS11.1

needs_token = pytest.mark.skipif(not ED_TOKEN, reason="ED_API_TOKEN not set")


@pytest.fixture
async def ed_lessons() -> EdLessonsAdapter:
    """Create an EdLessonsAdapter with the real token."""
    assert ED_TOKEN is not None
    adapter = EdLessonsAdapter(api_token=ED_TOKEN)
    yield adapter  # type: ignore[misc]
    await adapter.close()


@needs_token
async def test_get_lessons(ed_lessons: EdLessonsAdapter) -> None:
    """Verify get_lessons returns (lessons, modules) tuple with data."""
    result = await ed_lessons.get_lessons(ED_COURSE_ID)
    assert isinstance(result, tuple)
    assert len(result) == 2
    lessons, modules = result
    assert isinstance(lessons, list)
    assert isinstance(modules, list)
    assert len(lessons) >= 1


@needs_token
async def test_get_lesson_detail(ed_lessons: EdLessonsAdapter) -> None:
    """Verify get_lesson returns lesson detail with slides populated."""
    lessons, _ = await ed_lessons.get_lessons(ED_COURSE_ID)
    assert len(lessons) >= 1

    first_lesson = lessons[0]
    lesson_id = str(first_lesson["id"])
    detail = await ed_lessons.get_lesson(lesson_id)

    assert "id" in detail
    assert "title" in detail
    # Slides should be populated in the detail endpoint
    assert "slides" in detail


@needs_token
async def test_slide_content_field_name(ed_lessons: EdLessonsAdapter) -> None:
    """Validate TRD SS9.4: slide content uses 'content' field, not 'passage'."""
    lessons, _ = await ed_lessons.get_lessons(ED_COURSE_ID)

    # Find a lesson with slides
    for lesson_summary in lessons:
        slide_count = lesson_summary.get("slide_count", 0)
        if isinstance(slide_count, int) and slide_count > 0:
            lesson_id = str(lesson_summary["id"])
            detail = await ed_lessons.get_lesson(lesson_id)
            slides = detail.get("slides", [])
            if isinstance(slides, list) and len(slides) > 0:
                # Verify 'content' field exists (not 'passage')
                first_slide = slides[0]
                assert isinstance(first_slide, dict)
                assert "content" in first_slide
                return

    pytest.skip("No lessons with slides found for field name validation")


@needs_token
async def test_lesson_number_field_name(ed_lessons: EdLessonsAdapter) -> None:
    """Validate TRD SS9.4: lesson uses 'number' field, not 'lesson_number'."""
    lessons, _ = await ed_lessons.get_lessons(ED_COURSE_ID)

    for lesson in lessons:
        # 'number' field should be present (may be None)
        assert "number" in lesson, "'number' field missing -- might be using 'lesson_number'"


async def test_field_map_constants() -> None:
    """Verify ED_FIELD_MAP constants match TRD SS9.4 corrections (no token needed)."""
    assert ED_FIELD_MAP["content"] == "content"
    assert ED_FIELD_MAP["number"] == "number"
    assert ED_FIELD_MAP["user_id"] == "user_id"
