"""Ed Discussion adapter with defensive Pydantic parsing (standalone, no SQLAlchemy)."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import structlog
from pydantic import BaseModel, ConfigDict, ValidationError

from uniboard_mcp.adapters.resilience import CircuitBreaker, RetryConfig
from uniboard_mcp.errors import TokenInvalidError, UpstreamUnavailableError

logger = structlog.get_logger()


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
    content: str = ""
    is_endorsed: bool = False
    is_answered: bool = False
    is_staff_answered: bool = False
    is_student_answered: bool = False
    is_pinned: bool = False
    vote_count: int = 0
    created_at: str = ""


class EdDiscussionAdapter:
    """Ed Discussion API client with circuit breaker and defensive parsing."""

    def __init__(
        self,
        api_token: str,
        base_url: str = "https://edstem.org/api",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )
        if http_client is not None:
            self._client.headers["Authorization"] = f"Bearer {api_token}"
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
                raise UpstreamUnavailableError("Ed Discussion circuit breaker is open")

            start = time.monotonic()
            response = await self._client.request(method, path, params=params)
            duration = time.monotonic() - start

            logger.debug(
                "ed_discussion_request",
                method=method,
                path=path,
                status=response.status_code,
                duration_ms=round(duration * 1000),
                attempt=attempt + 1,
            )

            if response.status_code in (401, 403):
                self._circuit.record_failure()
                raise TokenInvalidError("Ed Discussion")

            if self._retry.is_retryable(response.status_code):
                self._circuit.record_failure()
                if attempt < self._retry.max_attempts - 1:
                    delay = self._retry.get_delay(attempt)
                    logger.warning(
                        "ed_discussion_request_retry",
                        attempt=attempt + 1,
                        status=response.status_code,
                        delay=delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                return response

            self._circuit.record_success()
            return response

        raise UpstreamUnavailableError("Ed Discussion request failed after retries")

    def _parse_threads(self, items: list[dict[str, object]]) -> list[dict[str, object]]:
        """Parse thread items with per-item error handling."""
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
                return []
            data = response.json()
            raw_threads: list[dict[str, object]] = data.get("threads", [])
            return self._parse_threads(raw_threads)
        except (httpx.RequestError, UpstreamUnavailableError):
            return []

    async def get_thread(self, thread_id: str) -> dict[str, object]:
        """Fetch a single thread by ID."""
        try:
            response = await self._request("GET", f"/threads/{thread_id}")
            if response.status_code != 200:
                return {}
            data = response.json()
            raw_thread: dict[str, object] = data.get("thread", {})
            thread = EdThreadResponse.model_validate(raw_thread)
            return thread.model_dump()
        except (httpx.RequestError, UpstreamUnavailableError, ValidationError):
            return {}

    async def search_threads(
        self, course_id: str, query: str
    ) -> list[dict[str, object]]:
        """Search threads within a course."""
        try:
            response = await self._request(
                "GET",
                f"/courses/{course_id}/threads",
                params={"search": query},
            )
            if response.status_code != 200:
                return []
            data = response.json()
            raw_threads: list[dict[str, object]] = data.get("threads", [])
            return self._parse_threads(raw_threads)
        except (httpx.RequestError, UpstreamUnavailableError):
            return []

    async def validate_token(self) -> bool:
        """Check token validity via GET /courses."""
        try:
            response = await self._client.get("/courses")
            return response.status_code == 200
        except (httpx.RequestError, UpstreamUnavailableError):
            return False

    async def close(self) -> None:
        """Close the underlying HTTP client if we own it."""
        if self._owns_client:
            await self._client.aclose()
