"""Canvas LMS adapter implementing LMSAdapter with resilience (TRD SS10, SS14)."""

from __future__ import annotations

import re
import time
from typing import Any

import httpx
import structlog

from src.adapters.base import LMSAdapter
from src.adapters.resilience import CanvasRateLimiter, CircuitBreaker
from src.schemas.common import (
    RateLimitedError,
    TokenInvalidError,
    UpstreamAPIError,
    UpstreamUnavailableError,
)

logger = structlog.get_logger()

# Regex for parsing Link header pagination
_LINK_NEXT_RE = re.compile(r'<([^>]+)>;\s*rel="next"')


class CanvasAdapter(LMSAdapter):
    """Canvas LMS API client with circuit breaker and rate limiting."""

    def __init__(
        self,
        api_token: str,
        base_url: str = "https://canvas.sydney.edu.au/api/v1",
    ) -> None:
        self._base_url = base_url
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )
        self._rate_limiter = CanvasRateLimiter()
        self._circuit = CircuitBreaker()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Execute a single Canvas API request with circuit breaker and rate limiting."""
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
            size=len(response.content),
        )

        if response.status_code in (401, 403):
            self._circuit.record_failure()
            raise TokenInvalidError("Canvas")

        if response.status_code == 429:
            self._circuit.record_failure()
            retry_after = response.headers.get("retry-after", "10")
            raise RateLimitedError(
                f"Canvas rate limited, retry after {retry_after}s"
            )

        if response.status_code >= 500:
            self._circuit.record_failure()
            raise UpstreamAPIError("Canvas", f"HTTP {response.status_code}")

        self._circuit.record_success()
        return response

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

        # Follow pagination via Link header
        while True:
            link_header = response.headers.get("link", "")
            match = _LINK_NEXT_RE.search(link_header)
            if not match:
                break
            next_url = match.group(1)

            # Next URL is absolute; bypass base_url
            if not self._circuit.can_execute():
                raise UpstreamUnavailableError("Canvas circuit breaker is open")
            await self._rate_limiter.wait_if_needed()

            start = time.monotonic()
            # For absolute URLs from pagination, use a fresh client request
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
                break

            self._circuit.record_success()
            page_data = response.json()
            if isinstance(page_data, list):
                results.extend(page_data)
            else:
                results.append(page_data)

        return results

    # --- LMSAdapter implementation ---

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

    async def get_external_tool(
        self, course_id: str, tool_id: str
    ) -> dict[str, object]:
        """Fetch a specific external tool configuration."""
        response = await self._request(
            "GET", f"/courses/{course_id}/external_tools/{tool_id}"
        )
        result: dict[str, object] = response.json()
        return result

    async def validate_token(self) -> bool:
        """Check token validity via GET /users/self."""
        try:
            response = await self._client.get("/users/self")
            return response.status_code == 200
        except (httpx.RequestError, Exception):
            return False

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()
