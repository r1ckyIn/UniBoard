"""Ed Discussion adapter with defensive Pydantic parsing (TRD SS2, SS14)."""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from pydantic import BaseModel, ConfigDict, ValidationError

from src.adapters._ed_base import EdRequestMixin
from src.adapters.base import DiscussionAdapter
from src.adapters.resilience import CircuitBreaker, RetryConfig
from src.schemas.common import UpstreamUnavailableError

logger = structlog.get_logger()


# --- Pydantic response models (extra='ignore' for undocumented fields) ---


class EdUserInfo(BaseModel):
    """Ed user info embedded in thread responses."""

    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    course_role: str = ""


class EdThreadResponse(BaseModel):
    """Validated Ed Discussion thread response."""

    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    title: str
    user_id: int | None = None
    user: EdUserInfo | None = None
    category: str = ""
    content: str = ""  # Ed XML <document version="2.0">
    is_endorsed: bool = False
    is_answered: bool = False
    is_staff_answered: bool = False
    is_student_answered: bool = False
    is_pinned: bool = False
    vote_count: int = 0
    created_at: str = ""


class EdDiscussionAdapter(EdRequestMixin, DiscussionAdapter):
    """Ed Discussion API client with circuit breaker and defensive parsing."""

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
        self._platform_name = "Ed Discussion"

    def _parse_threads(self, items: list[dict[str, object]]) -> list[dict[str, object]]:
        """Parse thread items with per-item error handling.

        Failed items are logged and skipped rather than crashing the whole response.
        """
        parsed: list[dict[str, object]] = []
        for item in items:
            try:
                thread = EdThreadResponse.model_validate(item)
                parsed.append(thread.model_dump())
            except ValidationError:
                thread_id = item.get("id", "unknown")
                logger.warning("ed_thread_parse_error", thread_id=thread_id)
        return parsed

    async def get_threads(
        self,
        course_id: str,
        *,
        filter: str | None = None,
        sort: str = "new",
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, object]]:
        """Fetch discussion threads for a course with optional filtering."""
        req_params: dict[str, Any] = {
            "sort": sort,
            "limit": limit,
            "offset": offset,
        }
        if filter is not None:
            req_params["filter"] = filter

        try:
            response = await self._request(
                "GET",
                f"/courses/{course_id}/threads",
                params=req_params,
            )
            if response.status_code != 200:
                logger.warning(
                    "ed_threads_error",
                    course_id=course_id,
                    status=response.status_code,
                )
                return []

            data = response.json()
            raw_threads: list[dict[str, object]] = data.get("threads", [])
            return self._parse_threads(raw_threads)
        except (httpx.RequestError, UpstreamUnavailableError) as exc:
            logger.error("ed_threads_network_error", error=str(exc))
            return []

    async def get_thread(self, thread_id: str) -> dict[str, object]:
        """Fetch a single thread by ID."""
        try:
            response = await self._request("GET", f"/threads/{thread_id}", params=None)
            if response.status_code != 200:
                return {}
            data = response.json()
            raw_thread: dict[str, object] = data.get("thread", {})
            thread = EdThreadResponse.model_validate(raw_thread)
            return thread.model_dump()
        except (httpx.RequestError, UpstreamUnavailableError, ValidationError) as exc:
            logger.error("ed_get_thread_error", thread_id=thread_id, error=str(exc))
            return {}

    async def search_threads(
        self, course_id: str, query: str
    ) -> list[dict[str, object]]:
        """Search threads within a course."""
        search_params: dict[str, Any] = {"search": query}
        try:
            response = await self._request(
                "GET",
                f"/courses/{course_id}/threads",
                params=search_params,
            )
            if response.status_code != 200:
                return []
            data = response.json()
            raw_threads: list[dict[str, object]] = data.get("threads", [])
            return self._parse_threads(raw_threads)
        except (httpx.RequestError, UpstreamUnavailableError) as exc:
            logger.error("ed_search_error", error=str(exc))
            return []

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
