"""Route MCP Agent tool calls to real platform adapters."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Any

import structlog

from src.adapters.canvas import CanvasAdapter
from src.adapters.ed_discussion import EdDiscussionAdapter
from src.adapters.ed_lessons import EdLessonsAdapter
from src.schemas.common import TokenInvalidError, UpstreamAPIError, UpstreamUnavailableError

if TYPE_CHECKING:
    from src.models.course import Course

logger = structlog.get_logger()


class ToolExecutor:
    """Route MCP Agent tool calls to real platform adapters."""

    def __init__(
        self,
        canvas_token: str | None,
        ed_token: str | None,
        course: Course,
    ) -> None:
        self._canvas_token = canvas_token
        self._ed_token = ed_token
        self._course = course
        self._canvas_adapter: CanvasAdapter | None = None
        self._ed_discussion_adapter: EdDiscussionAdapter | None = None
        self._ed_lessons_adapter: EdLessonsAdapter | None = None

    async def execute(self, name: str, input_data: dict[str, object]) -> str:
        """Execute a tool call and return text result for Claude."""
        if name == "search_canvas_modules":
            return await self._search_canvas(str(input_data.get("query", "")))
        elif name == "search_ed_threads":
            return await self._search_ed_threads(str(input_data.get("query", "")))
        elif name == "get_ed_lesson_content":
            return await self._get_ed_lesson(int(input_data.get("lesson_id", 0)))
        else:
            return f"Unknown tool: {name}"

    async def _with_adapter_error_handling(
        self,
        platform: str,
        fn: Callable[[], Awaitable[str]],
    ) -> str:
        """Run an adapter call with standardized error handling."""
        try:
            return await fn()
        except TokenInvalidError:
            return f"{platform} API token is invalid or expired. Please update in Settings."
        except (UpstreamUnavailableError, UpstreamAPIError) as exc:
            return f"{platform} API temporarily unavailable: {exc}. Try again later."

    def _require_canvas_token(self) -> str | None:
        """Return error message if Canvas token is missing, else None."""
        if self._canvas_token is None:
            return "Canvas API token not configured. Please add your Canvas API token in Settings."
        if self._course.canvas_course_id is None:
            return "No Canvas course linked."
        return None

    def _require_ed_token(self, *, need_course: bool = True) -> str | None:
        """Return error message if Ed token is missing, else None."""
        if self._ed_token is None:
            return "Ed API token not configured. Please add your Ed API token in Settings."
        if need_course and self._course.ed_course_id is None:
            return "No Ed Discussion course linked."
        return None

    async def _search_canvas(self, query: str) -> str:
        """Search Canvas course modules and filter by query."""
        if err := self._require_canvas_token():
            return err

        async def _do() -> str:
            if self._canvas_adapter is None:
                self._canvas_adapter = CanvasAdapter(api_token=self._canvas_token)  # type: ignore[arg-type]

            modules: list[dict[str, Any]] = await self._canvas_adapter.get_modules(
                self._course.canvas_course_id, include_items=True
            )

            query_lower = query.lower()
            matches: list[str] = []
            for module in modules:
                module_name = module.get("name", "")
                items: list[dict[str, Any]] = module.get("items", [])
                for item in items:
                    title = str(item.get("title", ""))
                    content = str(item.get("content", ""))
                    if query_lower in title.lower() or query_lower in content.lower():
                        content_preview = content[:500] if content else ""
                        entry = f"[Module: {module_name}] {title}"
                        if content_preview:
                            entry += f": {content_preview}"
                        matches.append(entry)

            if not matches:
                return f"No Canvas modules matched query: {query}"
            return "\n\n".join(matches)

        return await self._with_adapter_error_handling("Canvas", _do)

    async def _search_ed_threads(self, query: str) -> str:
        """Search Ed Discussion threads via server-side API search."""
        if err := self._require_ed_token():
            return err

        async def _do() -> str:
            if self._ed_discussion_adapter is None:
                self._ed_discussion_adapter = EdDiscussionAdapter(api_token=self._ed_token)  # type: ignore[arg-type]

            threads = await self._ed_discussion_adapter.search_threads(
                self._course.ed_course_id, query
            )

            if not threads:
                return f"No Ed threads matched query: {query}"

            matches: list[str] = []
            for thread in threads:
                thread_id = thread.get("id", "?")
                title = str(thread.get("title", ""))
                content = str(thread.get("content", ""))[:500]
                is_endorsed = thread.get("is_endorsed", False)
                matches.append(
                    f"[Ed Thread #{thread_id}] {title} "
                    f"(endorsed={is_endorsed}): {content}"
                )
            return "\n\n".join(matches)

        return await self._with_adapter_error_handling("Ed", _do)

    async def _get_ed_lesson(self, lesson_id: int) -> str:
        """Fetch a specific Ed lesson with slides."""
        if err := self._require_ed_token(need_course=False):
            return err

        async def _do() -> str:
            if self._ed_lessons_adapter is None:
                self._ed_lessons_adapter = EdLessonsAdapter(api_token=self._ed_token)  # type: ignore[arg-type]

            lesson = await self._ed_lessons_adapter.get_lesson(str(lesson_id))
            if not lesson:
                return f"Lesson {lesson_id} not found or empty."

            title = lesson.get("title", "Unknown Lesson")
            slides: list[dict[str, Any]] = lesson.get("slides", [])

            parts: list[str] = [f"Lesson: {title}\n"]
            if slides:
                parts.append("Slides:")
                for slide in slides:
                    slide_content = str(slide.get("content", ""))[:1000]
                    slide_title = slide.get("title", "")
                    if slide_title:
                        parts.append(f"  [{slide_title}] {slide_content}")
                    else:
                        parts.append(f"  {slide_content}")

            return "\n".join(parts)

        return await self._with_adapter_error_handling("Ed", _do)

    async def close(self) -> None:
        """Close all adapter HTTP clients."""
        if self._canvas_adapter:
            await self._canvas_adapter.close()
        if self._ed_discussion_adapter:
            await self._ed_discussion_adapter.close()
        if self._ed_lessons_adapter:
            await self._ed_lessons_adapter.close()
