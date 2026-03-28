"""Unit tests for TranslationService batch AI translation."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.translation import TranslationService


@pytest.fixture()
def mock_ai_engine() -> MagicMock:
    """Create a mock AIEngine with mock AsyncAnthropic client."""
    engine = MagicMock()
    engine._client = MagicMock()
    engine._client.messages = MagicMock()
    engine._client.messages.create = AsyncMock()
    return engine


@pytest.fixture()
def mock_session() -> AsyncMock:
    """Create a mock AsyncSession."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    return session


def _make_api_response(translations: list[dict[str, str]]) -> MagicMock:
    """Build a mock Anthropic message response with JSON text."""
    content_block = MagicMock()
    content_block.text = json.dumps(translations, ensure_ascii=False)
    resp = MagicMock()
    resp.content = [content_block]
    return resp


class TestBatchTranslate:
    """Tests for TranslationService.batch_translate."""

    @pytest.mark.asyncio()
    async def test_batch_translate_returns_translations(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """batch_translate returns list of translated strings matching input order."""
        items = ["Introduction to Programming", "Data Structures"]
        api_resp = _make_api_response([
            {"original": "Introduction to Programming", "zh": "编程导论"},
            {"original": "Data Structures", "zh": "数据结构"},
        ])
        mock_ai_engine._client.messages.create.return_value = api_resp

        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        result = await svc.batch_translate(items)

        assert result == ["编程导论", "数据结构"]
        mock_ai_engine._client.messages.create.assert_called_once()

    @pytest.mark.asyncio()
    async def test_batch_translate_empty_input(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """batch_translate handles empty input list (returns empty list)."""
        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        result = await svc.batch_translate([])

        assert result == []
        mock_ai_engine._client.messages.create.assert_not_called()

    @pytest.mark.asyncio()
    async def test_batch_translate_multiple_batches(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """batch_translate with batch_size=2 makes multiple API calls for 5 items."""
        items = ["A", "B", "C", "D", "E"]
        # 3 calls: [A,B], [C,D], [E]
        mock_ai_engine._client.messages.create.side_effect = [
            _make_api_response([{"original": "A", "zh": "甲"}, {"original": "B", "zh": "乙"}]),
            _make_api_response([{"original": "C", "zh": "丙"}, {"original": "D", "zh": "丁"}]),
            _make_api_response([{"original": "E", "zh": "戊"}]),
        ]

        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        result = await svc.batch_translate(items, batch_size=2)

        assert result == ["甲", "乙", "丙", "丁", "戊"]
        assert mock_ai_engine._client.messages.create.call_count == 3

    @pytest.mark.asyncio()
    async def test_batch_translate_invalid_json_fallback(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """Handles AI returning invalid JSON gracefully (logs warning, falls back)."""
        items = ["Algorithms", "Networks"]
        bad_block = MagicMock()
        bad_block.text = "NOT VALID JSON!!!"
        bad_resp = MagicMock()
        bad_resp.content = [bad_block]
        mock_ai_engine._client.messages.create.return_value = bad_resp

        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        result = await svc.batch_translate(items)

        # Fallback: returns original strings
        assert result == ["Algorithms", "Networks"]


class TestTranslateCourseContent:
    """Tests for TranslationService.translate_course_content."""

    @pytest.mark.asyncio()
    async def test_translate_updates_untranslated_items(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """translate_course_content updates name_zh for course, modules, lessons, deadlines."""
        course_id = uuid.uuid4()

        # Build mock course with relationships
        course = MagicMock()
        course.id = course_id
        course.name = "Software Design"
        course.name_zh = None

        module = MagicMock()
        module.name = "Week 1 Intro"
        module.name_zh = None
        module.items = []

        lesson = MagicMock()
        lesson.title = "Getting Started"
        lesson.title_zh = None

        deadline = MagicMock()
        deadline.title = "Assignment 1"
        deadline.title_zh = None

        course.modules = [module]
        course.lessons = [lesson]
        course.unified_deadlines = [deadline]

        # Mock session.execute for course query
        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = course
        mock_session.execute.return_value = scalar_result

        # Mock batch_translate
        api_resp = _make_api_response([
            {"original": "Software Design", "zh": "软件设计"},
            {"original": "Week 1 Intro", "zh": "第一周介绍"},
            {"original": "Getting Started", "zh": "入门"},
            {"original": "Assignment 1", "zh": "作业一"},
        ])
        mock_ai_engine._client.messages.create.return_value = api_resp

        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        count = await svc.translate_course_content(course_id)

        assert count == 4
        assert course.name_zh == "软件设计"
        assert module.name_zh == "第一周介绍"
        assert lesson.title_zh == "入门"
        assert deadline.title_zh == "作业一"
        mock_session.flush.assert_called_once()

    @pytest.mark.asyncio()
    async def test_translate_skips_already_translated(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """translate_course_content skips items that already have name_zh populated."""
        course_id = uuid.uuid4()

        course = MagicMock()
        course.id = course_id
        course.name = "Software Design"
        course.name_zh = "软件设计"  # Already translated

        module = MagicMock()
        module.name = "Week 1"
        module.name_zh = "第一周"  # Already translated
        module.items = []

        course.modules = [module]
        course.lessons = []
        course.unified_deadlines = []

        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = course
        mock_session.execute.return_value = scalar_result

        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        count = await svc.translate_course_content(course_id)

        assert count == 0
        mock_ai_engine._client.messages.create.assert_not_called()
        mock_session.flush.assert_not_called()

    @pytest.mark.asyncio()
    async def test_translate_course_not_found(
        self, mock_session: AsyncMock, mock_ai_engine: MagicMock
    ) -> None:
        """translate_course_content returns 0 for non-existent course."""
        course_id = uuid.uuid4()

        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = scalar_result

        svc = TranslationService(session=mock_session, ai_engine=mock_ai_engine)
        count = await svc.translate_course_content(course_id)

        assert count == 0
