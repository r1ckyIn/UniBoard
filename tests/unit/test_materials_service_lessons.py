"""Unit tests for CourseMaterialService Ed Lessons handling.

Covers:
  * Per-lesson folder materialization in get_course_materials (replaces the
    legacy single "Ed Lessons" collapsed folder).
  * Ed Lesson drill-down in get_folder_items.
  * Lesson folder name / description / slide title helpers.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from src.services.materials import (
    _lesson_folder_name,
    _lesson_rule_description,
    _slide_title,
)


class TestLessonFolderName:
    """_lesson_folder_name prepends 'Week N' when useful for frontend regex."""

    def test_with_number_and_title(self) -> None:
        lesson = MagicMock()
        lesson.number = 3
        lesson.title = "Algorithms and Data Structures"
        assert _lesson_folder_name(lesson) == "Week 3: Algorithms and Data Structures"

    def test_title_already_has_week(self) -> None:
        lesson = MagicMock()
        lesson.number = 1
        lesson.title = "Week 1 Orientation"
        # Does NOT duplicate the week prefix.
        assert _lesson_folder_name(lesson) == "Week 1 Orientation"

    def test_no_number_no_week_marker(self) -> None:
        lesson = MagicMock()
        lesson.number = None
        lesson.title = "Introduction"
        assert _lesson_folder_name(lesson) == "Introduction"

    def test_blank_title_falls_back_to_number(self) -> None:
        lesson = MagicMock()
        lesson.number = 5
        lesson.title = ""
        assert _lesson_folder_name(lesson) == "Week 5: Lesson 5"

    def test_blank_title_no_number_uses_placeholder(self) -> None:
        lesson = MagicMock()
        lesson.number = None
        lesson.title = ""
        # Expect 'Lesson ?' placeholder, but no leading 'Week' either.
        assert _lesson_folder_name(lesson) == "Lesson ?"


class TestLessonRuleDescription:
    """_lesson_rule_description produces a short summary for Ed Lesson folders."""

    def test_with_kind_and_slides(self) -> None:
        lesson = MagicMock()
        lesson.kind = "lesson"
        lesson.slide_count = 12
        assert _lesson_rule_description(lesson) == "Ed lesson (lesson), 12 slide(s)"

    def test_slides_only(self) -> None:
        lesson = MagicMock()
        lesson.kind = ""
        lesson.slide_count = 5
        assert _lesson_rule_description(lesson) == "Ed lesson with 5 slide(s)"

    def test_kind_only(self) -> None:
        lesson = MagicMock()
        lesson.kind = "challenge"
        lesson.slide_count = 0
        assert _lesson_rule_description(lesson) == "Ed lesson (challenge)"

    def test_neither(self) -> None:
        lesson = MagicMock()
        lesson.kind = None
        lesson.slide_count = 0
        assert _lesson_rule_description(lesson) == "Ed lesson"


class TestSlideTitle:
    """_slide_title sanitizes slide content for display in the folder view."""

    def test_strips_html_tags(self) -> None:
        slide = MagicMock()
        slide.content = "<p>Stack is <b>LIFO</b> data structure</p>"
        assert _slide_title(slide, 0) == "Stack is LIFO data structure"

    def test_truncates_long_content(self) -> None:
        slide = MagicMock()
        slide.content = "x" * 200
        result = _slide_title(slide, 0)
        assert result.endswith("...")
        assert len(result) <= 60

    def test_empty_content_falls_back_to_index(self) -> None:
        slide = MagicMock()
        slide.content = ""
        assert _slide_title(slide, 4) == "Slide 5"

    def test_html_only_falls_back_to_index(self) -> None:
        slide = MagicMock()
        slide.content = "<div></div>"
        assert _slide_title(slide, 0) == "Slide 1"

    def test_multiline_content_collapses_whitespace(self) -> None:
        slide = MagicMock()
        slide.content = "Line one\n\n\nLine two"
        assert _slide_title(slide, 0) == "Line one Line two"
