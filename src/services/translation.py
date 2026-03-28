"""Batch AI translation service for course content localization."""

from __future__ import annotations

import json
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.course import Course
from src.models.module import Module
from src.prompts.translation import TRANSLATION_SYSTEM_PROMPT
from src.services.ai_engine import AIEngine

logger = structlog.get_logger()

# Batch size: 50 items per API call to stay within context window
_BATCH_SIZE = 50


class TranslationService:
    """Batch translate course content from English to Chinese using Claude."""

    def __init__(self, session: AsyncSession, ai_engine: AIEngine) -> None:
        self._session = session
        self._ai_engine = ai_engine

    async def batch_translate(
        self,
        items: list[str],
        batch_size: int = _BATCH_SIZE,
    ) -> list[str]:
        """Translate a list of English strings to Chinese.

        Returns list of Chinese translations in same order as input.
        Uses claude-sonnet for fast, cheap translation.
        """
        if not items:
            return []

        results: list[str] = []

        for i in range(0, len(items), batch_size):
            batch = items[i : i + batch_size]
            batch_json = json.dumps(batch, ensure_ascii=False)

            try:
                response = await self._ai_engine._client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    system=TRANSLATION_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": batch_json}],
                )

                raw_text: str = response.content[0].text  # type: ignore[union-attr]
                parsed: list[dict[str, str]] = json.loads(raw_text)

                for entry in parsed:
                    results.append(entry.get("zh", entry.get("original", "")))

            except (json.JSONDecodeError, KeyError, IndexError) as exc:
                logger.warning(
                    "translation_batch_failed",
                    batch_index=i,
                    error=str(exc),
                )
                # Fallback: use original strings for this batch
                results.extend(batch)

        return results

    async def translate_course_content(self, course_id: uuid.UUID) -> int:
        """Translate all untranslated content for a course.

        Returns count of items translated. Only translates items with null
        name_zh/title_zh columns (skip already translated).
        """
        # Load course with all related content
        stmt = (
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules).selectinload(Module.items),
                selectinload(Course.lessons),
                selectinload(Course.unified_deadlines),
            )
        )
        result = await self._session.execute(stmt)
        course = result.scalar_one_or_none()
        if course is None:
            return 0

        # Collect items needing translation: (object, attribute_name, source_text)
        to_translate: list[tuple[object, str, str]] = []

        if course.name and not course.name_zh:
            to_translate.append((course, "name_zh", course.name))

        for module in course.modules:
            if module.name and not module.name_zh:
                to_translate.append((module, "name_zh", module.name))
            for item in module.items:
                if item.title and not item.title_zh:
                    to_translate.append((item, "title_zh", item.title))

        for lesson in course.lessons:
            if lesson.title and not lesson.title_zh:
                to_translate.append((lesson, "title_zh", lesson.title))

        for deadline in course.unified_deadlines:
            if deadline.title and not deadline.title_zh:
                to_translate.append((deadline, "title_zh", deadline.title))

        if not to_translate:
            return 0

        # Batch translate all source texts
        source_texts = [t[2] for t in to_translate]
        translations = await self.batch_translate(source_texts)

        # Apply translations to ORM objects
        for (obj, attr, _), zh_text in zip(to_translate, translations, strict=True):
            setattr(obj, attr, zh_text)

        await self._session.flush()

        logger.info(
            "course_content_translated",
            course_id=str(course_id),
            items_translated=len(to_translate),
        )
        return len(to_translate)
