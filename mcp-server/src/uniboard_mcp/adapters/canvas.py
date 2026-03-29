"""Canvas LMS adapter with resilience patterns (standalone, no SQLAlchemy)."""

from __future__ import annotations

import asyncio
import re
import time
from typing import Any

import httpx
import structlog

from uniboard_mcp.adapters.resilience import CanvasRateLimiter, CircuitBreaker, RetryConfig
from uniboard_mcp.errors import (
    RateLimitedError,
    TokenInvalidError,
    UpstreamAPIError,
    UpstreamUnavailableError,
)

logger = structlog.get_logger()

_LINK_NEXT_RE = re.compile(r'<([^>]+)>;\s*rel="next"')


class CanvasAdapter:
    """Canvas LMS API client with circuit breaker and rate limiting."""

    def __init__(
        self,
        api_token: str,
        base_url: str = "https://canvas.sydney.edu.au/api/v1",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url = base_url
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )
        if http_client is not None:
            # Ensure auth header is set on shared client
            self._client.headers["Authorization"] = f"Bearer {api_token}"
        self._rate_limiter = CanvasRateLimiter()
        self._circuit = CircuitBreaker()
        self._retry = RetryConfig()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Execute a single Canvas API request with retry, circuit breaker and rate limiting."""
        last_response: httpx.Response | None = None
        for attempt in range(self._retry.max_attempts):
            if not self._circuit.can_execute():
                raise UpstreamUnavailableError("Canvas circuit breaker is open")

            await self._rate_limiter.wait_if_needed()

            start = time.monotonic()
            response = await self._client.request(method, path, params=params)
            duration = time.monotonic() - start

            self._rate_limiter.update_from_headers(response.headers)

            logger.debug(
                "canvas_request",
                method=method,
                path=path,
                status=response.status_code,
                duration_ms=round(duration * 1000),
                attempt=attempt + 1,
            )

            if response.status_code in (401, 403):
                self._circuit.record_failure()
                raise TokenInvalidError("Canvas")

            if self._retry.is_retryable(response.status_code):
                self._circuit.record_failure()
                last_response = response
                if attempt < self._retry.max_attempts - 1:
                    delay = self._retry.get_delay(attempt)
                    logger.warning(
                        "canvas_request_retry",
                        attempt=attempt + 1,
                        status=response.status_code,
                        delay=delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                break

            self._circuit.record_success()
            return response

        if last_response is not None:
            if last_response.status_code == 429:
                retry_after = last_response.headers.get("retry-after", "10")
                raise RateLimitedError(
                    f"Canvas rate limited, retry after {retry_after}s"
                )
            raise UpstreamAPIError("Canvas", f"HTTP {last_response.status_code}")

        raise UpstreamAPIError("Canvas", "request failed after retries")

    async def _paginate(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, object]]:
        """Follow Link header rel="next" to collect all pages."""
        results: list[dict[str, object]] = []
        response = await self._request("GET", path, params=params)
        data = response.json()
        if isinstance(data, list):
            results.extend(data)
        else:
            results.append(data)

        while True:
            link_header = response.headers.get("link", "")
            match = _LINK_NEXT_RE.search(link_header)
            if not match:
                break
            next_url = match.group(1)

            if not self._circuit.can_execute():
                raise UpstreamUnavailableError("Canvas circuit breaker is open")
            await self._rate_limiter.wait_if_needed()

            start = time.monotonic()
            response = await self._client.send(
                self._client.build_request("GET", next_url)
            )
            duration = time.monotonic() - start

            self._rate_limiter.update_from_headers(response.headers)
            logger.debug(
                "canvas_paginate",
                url=next_url,
                status=response.status_code,
                duration_ms=round(duration * 1000),
            )

            if response.status_code >= 400:
                self._circuit.record_failure()
                if response.status_code in (401, 403):
                    raise TokenInvalidError("Canvas")
                if response.status_code == 429:
                    raise RateLimitedError("Canvas rate limited during pagination")
                if response.status_code >= 500:
                    raise UpstreamAPIError("Canvas", f"HTTP {response.status_code}")
                break

            self._circuit.record_success()
            page_data = response.json()
            if isinstance(page_data, list):
                results.extend(page_data)
            else:
                results.append(page_data)

        return results

    async def get_courses(self) -> list[dict[str, object]]:
        """Fetch all active courses for the authenticated user."""
        return await self._paginate(
            "/courses",
            params={"enrollment_state": "active", "per_page": 100},
        )

    async def get_grades(self, course_id: str) -> list[dict[str, object]]:
        """Fetch enrollment/grade data for a course."""
        return await self._paginate(
            f"/courses/{course_id}/enrollments",
            params={"user_id": "self", "include[]": "current_points"},
        )

    async def get_assignments(self, course_id: str) -> list[dict[str, object]]:
        """Fetch assignments for a course."""
        return await self._paginate(
            f"/courses/{course_id}/assignments",
            params={"per_page": 100},
        )

    async def get_modules(self, course_id: str) -> list[dict[str, object]]:
        """Fetch modules with inline items (include[]=items avoids N+1)."""
        return await self._paginate(
            f"/courses/{course_id}/modules",
            params={"include[]": "items", "per_page": 100},
        )

    async def get_tabs(self, course_id: str) -> list[dict[str, object]]:
        """Fetch navigation tabs for a course."""
        return await self._paginate(f"/courses/{course_id}/tabs")

    async def get_assignment_groups(self, course_id: str) -> list[dict[str, object]]:
        """Fetch assignment groups with weight info for a course."""
        return await self._paginate(
            f"/courses/{course_id}/assignment_groups",
            params={"per_page": 100},
        )

    async def get_announcements(self, course_id: str) -> list[dict[str, object]]:
        """Fetch announcements for a course (D-04)."""
        return await self._paginate(
            f"/courses/{course_id}/discussion_topics",
            params={"only_announcements": "true", "per_page": 50},
        )

    async def get_files(
        self, course_id: str, search: str = ""
    ) -> list[dict[str, object]]:
        """Fetch files for a course, optionally filtered by search term (D-04)."""
        params: dict[str, Any] = {"per_page": 100}
        if search:
            params["search_term"] = search
        return await self._paginate(f"/courses/{course_id}/files", params=params)

    async def validate_token(self) -> bool:
        """Check token validity via GET /users/self."""
        try:
            response = await self._client.get("/users/self")
            return response.status_code == 200
        except (httpx.RequestError, UpstreamUnavailableError):
            return False

    async def close(self) -> None:
        """Close the underlying HTTP client if we own it."""
        if self._owns_client:
            await self._client.aclose()
