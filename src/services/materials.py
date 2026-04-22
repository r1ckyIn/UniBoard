"""Course materials service with AI descriptions and full-text search."""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import UTC, datetime
from pathlib import PurePosixPath

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config import get_settings
from src.models.course import Course
from src.models.lesson import Lesson, Slide
from src.models.module import Module
from src.schemas.common import NotFoundError
from src.schemas.materials import (
    CourseMaterialsResponse,
    FolderItem,
    FolderResponse,
    SearchHit,
    SearchResponse,
)

logger = structlog.get_logger()


def _rule_based_description(item_names: list[str]) -> str:
    """Generate a rule-based folder description from item names and extensions."""
    if not item_names:
        return "Empty folder"

    # Extract file extensions and count types
    extensions: list[str] = []
    for name in item_names:
        suffix = PurePosixPath(name).suffix.lstrip(".").upper()
        if suffix:
            extensions.append(suffix)

    count = len(item_names)
    if extensions:
        counter = Counter(extensions)
        top_types = [ext for ext, _ in counter.most_common(3)]
        type_str = " and ".join(top_types)
        return f"Contains {count} files, mainly {type_str}"

    return f"Contains {count} items"


def _lesson_folder_name(lesson: Lesson) -> str:
    """Render a folder name for an Ed Lesson.

    Prefers a ``Week N: <title>`` shape so the frontend week extractor in
    ``MaterialsSection.tsx`` can pick up the week number. Falls back to the
    raw lesson title when ``lesson.number`` is missing or already embedded
    in the title (e.g. "Week 1 — Intro").
    """
    title = (lesson.title or "").strip() or f"Lesson {lesson.number or '?'}"
    lowered = title.lower()
    if "week" in lowered:
        # Title already contains a week marker; use as-is.
        return title
    if lesson.number is not None:
        return f"Week {lesson.number}: {title}"
    return title


def _lesson_rule_description(lesson: Lesson) -> str:
    """Rule-based description for an Ed Lesson folder.

    Uses slide count and kind to produce a one-line hint.
    """
    kind = (lesson.kind or "").strip()
    slide_count = lesson.slide_count or 0
    if slide_count > 0 and kind:
        return f"Ed lesson ({kind}), {slide_count} slide(s)"
    if slide_count > 0:
        return f"Ed lesson with {slide_count} slide(s)"
    if kind:
        return f"Ed lesson ({kind})"
    return "Ed lesson"


class CourseMaterialService:
    """Business logic for course materials, folder views, and full-text search."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_course_materials(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseMaterialsResponse:
        """Get unified folder view merging Canvas modules and Ed Lessons.

        Each Canvas module and each Ed Lesson becomes its own folder so the
        frontend can render per-week breakdowns (the legacy implementation
        collapsed all Ed lessons into a single folder, which defeated the
        week-badge layout on the course detail page).
        """
        stmt = (
            select(Course)
            .where(Course.id == course_id, Course.user_id == user_id)
            .options(
                selectinload(Course.modules).selectinload(Module.items),
                selectinload(Course.lessons),
            )
        )
        result = await self._session.execute(stmt)
        course = result.scalar_one_or_none()
        if course is None:
            raise NotFoundError("Course")

        folders: list[FolderResponse] = []
        position = 0

        # Canvas modules -> folders
        for module in sorted(course.modules, key=lambda m: m.position):
            item_names = [item.title for item in module.items]
            description = module.ai_description or _rule_based_description(item_names)
            folders.append(
                FolderResponse(
                    id=str(module.id),
                    name=module.name,
                    source="canvas",
                    position=position,
                    item_count=len(module.items),
                    ai_description=description,
                )
            )
            position += 1

        # Ed Lessons -> one folder per lesson (enables per-week rendering).
        # Sort by lesson.number first (nulls last), then by title for stable
        # ordering when multiple lessons share a number or lack one.
        def _lesson_sort_key(lesson: Lesson) -> tuple[int, int, str]:
            number_present = 0 if lesson.number is not None else 1
            number_val = lesson.number if lesson.number is not None else 0
            return (number_present, number_val, (lesson.title or "").lower())

        for lesson in sorted(course.lessons, key=_lesson_sort_key):
            folders.append(
                FolderResponse(
                    id=str(lesson.id),
                    name=_lesson_folder_name(lesson),
                    source="ed_lessons",
                    position=position,
                    item_count=lesson.slide_count or 0,
                    ai_description=_lesson_rule_description(lesson),
                )
            )
            position += 1

        return CourseMaterialsResponse(
            course_id=str(course.id),
            course_name=course.name,
            folders=folders,
        )

    async def get_folder_items(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
        folder_id: uuid.UUID,
    ) -> FolderResponse:
        """Get single folder with items populated.

        Tries Canvas module lookup first; on miss, falls back to an Ed Lesson
        lookup and returns its slides as folder items. The original
        implementation only supported Canvas modules which made the Ed Lessons
        drill-down return 404.
        """
        # --- Try Canvas module first ---
        module_stmt = (
            select(Module)
            .join(Course, Module.course_id == Course.id)
            .where(
                Module.id == folder_id,
                Course.id == course_id,
                Course.user_id == user_id,
            )
            .options(selectinload(Module.items))
        )
        module_result = await self._session.execute(module_stmt)
        module = module_result.scalar_one_or_none()
        if module is not None:
            items = [
                FolderItem(
                    id=str(item.id),
                    title=item.title,
                    type=item.type,
                    url=item.url,
                    source="canvas",
                )
                for item in module.items
            ]
            return FolderResponse(
                id=str(module.id),
                name=module.name,
                source="canvas",
                position=module.position,
                item_count=len(items),
                ai_description=module.ai_description or _rule_based_description(
                    [i.title for i in module.items]
                ),
                items=items,
            )

        # --- Fall back to Ed Lesson slide drill-down ---
        lesson_stmt = (
            select(Lesson)
            .join(Course, Lesson.course_id == Course.id)
            .where(
                Lesson.id == folder_id,
                Course.id == course_id,
                Course.user_id == user_id,
            )
            .options(selectinload(Lesson.slides))
        )
        lesson_result = await self._session.execute(lesson_stmt)
        lesson = lesson_result.scalar_one_or_none()
        if lesson is not None:
            slides_sorted = sorted(lesson.slides, key=lambda s: s.index)
            items = [
                FolderItem(
                    id=str(slide.id),
                    title=_slide_title(slide, idx),
                    type=slide.type or "slide",
                    url=None,
                    source="ed_lessons",
                )
                for idx, slide in enumerate(slides_sorted)
            ]
            return FolderResponse(
                id=str(lesson.id),
                name=_lesson_folder_name(lesson),
                source="ed_lessons",
                position=lesson.number or 0,
                item_count=len(items),
                ai_description=_lesson_rule_description(lesson),
                items=items,
            )

        raise NotFoundError("Folder")

    async def generate_ai_description(
        self,
        folder_name: str,
        item_names: list[str],
        course_name: str,
        user_id: uuid.UUID,
    ) -> str:
        """Generate AI description using Claude Haiku with rule-based fallback."""
        settings = get_settings()

        # Check daily AI limit
        from src.models.user import Profile

        user = await self._session.get(Profile, user_id)
        if user is None:
            return _rule_based_description(item_names)

        # Reset daily counter if the date has changed
        today_dt = datetime.now(UTC)
        if (
            user.ai_calls_reset_date is None
            or user.ai_calls_reset_date.date() < today_dt.date()
        ):
            user.ai_calls_today = 0
            user.ai_calls_reset_date = today_dt
            await self._session.flush()

        if user.ai_calls_today >= settings.ai_daily_limit_per_user:
            return _rule_based_description(item_names)

        if not settings.anthropic_api_key:
            return _rule_based_description(item_names)

        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            prompt = (
                f"Write ONE sentence describing this course folder. "
                f"Course: {course_name}, Folder: {folder_name}, "
                f"Contents: {item_names[:20]}. Be concise and informative."
            )
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}],
            )
            description = response.content[0].text  # type: ignore[union-attr]

            # Increment daily counter
            user.ai_calls_today += 1
            await self._session.flush()

            return str(description)
        except Exception:
            logger.warning(
                "ai_description_fallback",
                folder=folder_name,
                reason="API call failed",
            )
            return _rule_based_description(item_names)

    async def search(
        self,
        user_id: uuid.UUID,
        query: str,
    ) -> SearchResponse:
        """Full-text search across module items and lessons using tsvector."""
        results: list[SearchHit] = []

        # Search module_items
        module_stmt = text("""
            SELECT
                mi.id, mi.title, c.id AS course_id, c.name AS course_name,
                c.code AS course_code,
                ts_headline('simple', mi.title, plainto_tsquery('simple', :query),
                    'StartSel=<b>, StopSel=</b>') AS snippet,
                ts_rank(mi.search_vector, plainto_tsquery('simple', :query)) AS rank
            FROM module_items mi
            JOIN modules m ON mi.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE c.user_id = :user_id
                AND mi.search_vector @@ plainto_tsquery('simple', :query)
            ORDER BY rank DESC
            LIMIT 50
        """)
        result = await self._session.execute(
            module_stmt, {"query": query, "user_id": str(user_id)}
        )
        for row in result:
            results.append(
                SearchHit(
                    id=str(row.id),
                    title=row.title,
                    course_id=str(row.course_id),
                    course_name=row.course_name,
                    course_code=row.course_code,
                    type="module_item",
                    source="canvas",
                    snippet=row.snippet,
                    rank=float(row.rank),
                )
            )

        # Search lessons
        lesson_stmt = text("""
            SELECT
                l.id, l.title, c.id AS course_id, c.name AS course_name,
                c.code AS course_code,
                ts_headline('simple', l.title, plainto_tsquery('simple', :query),
                    'StartSel=<b>, StopSel=</b>') AS snippet,
                ts_rank(l.search_vector, plainto_tsquery('simple', :query)) AS rank
            FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE c.user_id = :user_id
                AND l.search_vector @@ plainto_tsquery('simple', :query)
            ORDER BY rank DESC
            LIMIT 50
        """)
        result = await self._session.execute(
            lesson_stmt, {"query": query, "user_id": str(user_id)}
        )
        for row in result:
            results.append(
                SearchHit(
                    id=str(row.id),
                    title=row.title,
                    course_id=str(row.course_id),
                    course_name=row.course_name,
                    course_code=row.course_code,
                    type="lesson",
                    source="ed_lessons",
                    snippet=row.snippet,
                    rank=float(row.rank),
                )
            )

        # Sort combined results by rank descending
        results.sort(key=lambda h: h.rank, reverse=True)

        return SearchResponse(
            query=query,
            total_hits=len(results),
            results=results,
        )


def _slide_title(slide: Slide, index: int) -> str:
    """Derive a short display title for a slide.

    Ed slide records do not always carry an explicit title column; we use the
    first ~60 characters of the slide content as a fallback so the frontend
    has something meaningful to render.
    """
    content = (slide.content or "").strip()
    if not content:
        return f"Slide {index + 1}"
    # Strip simple HTML tags for readability
    stripped = " ".join(content.split())
    # Drop angle-bracket tags with a greedy one-liner regex (cheap enough)
    import re

    clean = re.sub(r"<[^>]+>", "", stripped).strip()
    if not clean:
        return f"Slide {index + 1}"
    if len(clean) > 60:
        return clean[:57].rstrip() + "..."
    return clean
