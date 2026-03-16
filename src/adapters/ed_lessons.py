"""Ed Lessons adapter with verified field mappings from TRD SS9.4."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog
from pydantic import BaseModel, ConfigDict, ValidationError

from src.adapters.base import LessonAdapter
from src.adapters.resilience import CircuitBreaker, RetryConfig
from src.schemas.common import UpstreamUnavailableError

logger = structlog.get_logger()

# CRITICAL field mapping constants from TRD SS9.4 — these differ from hschafer/edstem
ED_FIELD_MAP: dict[str, str] = {
    "content": "content",  # NOT "passage" (hschafer/edstem error)
    "number": "number",  # NOT "lesson_number"
    "user_id": "user_id",  # NOT "creator_id"
}


# --- Pydantic response models (extra='ignore' for undocumented fields) ---


class EdSlideResponse(BaseModel):
    """Validated Ed slide response."""

    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    lesson_id: int
    content: str = ""  # CRITICAL: "content" not "passage"
    type: str = ""  # "document" | "code"
    title: str = ""
    index: int = 0
    is_hidden: bool = False


class EdLessonResponse(BaseModel):
    """Validated Ed lesson response."""

    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    title: str
    course_id: int
    module_id: int | None = None
    number: int | None = None  # CRITICAL: "number" not "lesson_number"
    kind: str = ""
    state: str = ""
    slide_count: int = 0
    due_at: str | None = None
    slides: list[EdSlideResponse] = []


class EdLessonDetailResponse(BaseModel):
    """Wrapper for single lesson detail endpoint: {"lesson": {...}}."""

    model_config = ConfigDict(extra="ignore", strict=False)

    lesson: EdLessonResponse


class EdModuleResponse(BaseModel):
    """Validated Ed module response."""

    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    course_id: int
    user_id: int | None = None  # CRITICAL: "user_id" not "creator_id"
    name: str


class EdLessonsAdapter(LessonAdapter):
    """Ed Lessons API client with circuit breaker and defensive parsing."""

    def __init__(
        self,
        api_token: str,
        base_url: str = "https://edstem.org/api",
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )
        self._circuit = CircuitBreaker()
        self._retry = RetryConfig()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Execute an Ed API request with retry and circuit breaker."""
        for attempt in range(self._retry.max_attempts):
            if not self._circuit.can_execute():
                logger.warning("ed_lessons_circuit_open")
                raise UpstreamUnavailableError("Ed Lessons circuit breaker is open")

            response = await self._client.request(method, path, params=params)

            if self._retry.is_retryable(response.status_code):
                self._circuit.record_failure()
                if attempt < self._retry.max_attempts - 1:
                    delay = self._retry.get_delay(attempt)
                    logger.warning(
                        "ed_lessons_request_retry",
                        attempt=attempt + 1,
                        status=response.status_code,
                        delay=delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                # Final attempt — return the response as-is for caller to handle
                return response

            self._circuit.record_success()
            return response

        # Unreachable, but satisfies mypy
        raise UpstreamUnavailableError("Ed Lessons request failed after retries")

    async def get_lessons(
        self, course_id: str
    ) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
        """Fetch lessons and modules for a course.

        Returns (lessons, modules). Slides array is empty in list endpoint;
        full slides only available via get_lesson().
        """
        try:
            response = await self._request(
                "GET", f"/courses/{course_id}/lessons"
            )
            if response.status_code != 200:
                logger.warning(
                    "ed_lessons_error",
                    course_id=course_id,
                    status=response.status_code,
                )
                return ([], [])

            data = response.json()
            raw_lessons: list[dict[str, object]] = data.get("lessons", [])
            raw_modules: list[dict[str, object]] = data.get("modules", [])

            # Parse with per-item error handling
            lessons: list[dict[str, object]] = []
            for item in raw_lessons:
                try:
                    lesson = EdLessonResponse.model_validate(item)
                    lessons.append(lesson.model_dump())
                except ValidationError:
                    lesson_id = item.get("id", "unknown")
                    logger.warning("ed_lesson_parse_error", lesson_id=lesson_id)

            modules: list[dict[str, object]] = []
            for item in raw_modules:
                try:
                    module = EdModuleResponse.model_validate(item)
                    modules.append(module.model_dump())
                except ValidationError:
                    module_id = item.get("id", "unknown")
                    logger.warning("ed_module_parse_error", module_id=module_id)

            return (lessons, modules)
        except (httpx.RequestError, UpstreamUnavailableError) as exc:
            logger.error("ed_lessons_network_error", error=str(exc))
            return ([], [])

    async def get_lesson(self, lesson_id: str) -> dict[str, object]:
        """Fetch a single lesson with slides populated."""
        try:
            response = await self._request("GET", f"/lessons/{lesson_id}")
            if response.status_code != 200:
                return {}
            data = response.json()
            detail = EdLessonDetailResponse.model_validate(data)
            return detail.lesson.model_dump()
        except (httpx.RequestError, UpstreamUnavailableError, ValidationError) as exc:
            logger.error("ed_get_lesson_error", lesson_id=lesson_id, error=str(exc))
            return {}

    async def validate_token(self) -> bool:
        """Check token validity via GET /courses."""
        try:
            response = await self._client.get("/courses")
            return response.status_code == 200
        except (httpx.RequestError, UpstreamUnavailableError):
            return False

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()
