"""Shared request logic for Ed Platform adapters."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import structlog

from src.adapters.resilience import CircuitBreaker, RetryConfig
from src.schemas.common import TokenInvalidError, UpstreamUnavailableError

logger = structlog.get_logger()


class EdRequestMixin:
    """Shared _request() for Ed Discussion and Ed Lessons adapters.

    Subclasses must set:
      _client: httpx.AsyncClient
      _circuit: CircuitBreaker
      _retry: RetryConfig
      _platform_name: str  (e.g. "Ed Discussion" or "Ed Lessons")
    """

    _client: httpx.AsyncClient
    _circuit: CircuitBreaker
    _retry: RetryConfig
    _platform_name: str

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Execute an Ed API request with retry and circuit breaker."""
        log_prefix = self._platform_name.lower().replace(" ", "_")

        for attempt in range(self._retry.max_attempts):
            if not self._circuit.can_execute():
                logger.warning(f"{log_prefix}_circuit_open")
                raise UpstreamUnavailableError(
                    f"{self._platform_name} circuit breaker is open"
                )

            start = time.monotonic()
            response = await self._client.request(method, path, params=params)
            duration = time.monotonic() - start

            logger.debug(
                f"{log_prefix}_request",
                method=method,
                path=path,
                status=response.status_code,
                duration_ms=round(duration * 1000),
                attempt=attempt + 1,
            )

            if response.status_code in (401, 403):
                self._circuit.record_failure()
                raise TokenInvalidError(self._platform_name)

            if self._retry.is_retryable(response.status_code):
                self._circuit.record_failure()
                if attempt < self._retry.max_attempts - 1:
                    delay = self._retry.get_delay(attempt)
                    logger.warning(
                        f"{log_prefix}_request_retry",
                        attempt=attempt + 1,
                        status=response.status_code,
                        delay=delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                # Final attempt -- return the response as-is for caller to handle
                return response

            self._circuit.record_success()
            return response

        # Unreachable, but satisfies mypy
        raise UpstreamUnavailableError(
            f"{self._platform_name} request failed after retries"
        )
