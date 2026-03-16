"""Resilience utilities: circuit breaker, rate limiter, retry logic (TRD SS14.5, SS14.7)."""

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum

import httpx
import structlog

logger = structlog.get_logger()


class CircuitState(Enum):
    """Circuit breaker states per TRD SS14.7."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    """Per-platform circuit breaker: CLOSED->OPEN after N failures, HALF_OPEN after cooldown."""

    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float = 0.0

    def record_success(self) -> None:
        """Reset failure count and return to CLOSED state."""
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self) -> None:
        """Increment failure count; transition to OPEN if threshold reached."""
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                "circuit_breaker_open",
                failure_count=self.failure_count,
                threshold=self.failure_threshold,
            )

    def can_execute(self) -> bool:
        """Check whether a request is allowed under current circuit state."""
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            elapsed = time.monotonic() - self.last_failure_time
            if elapsed >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                logger.info("circuit_breaker_half_open", elapsed=elapsed)
                return True
            return False
        # HALF_OPEN: allow one test request
        return True


@dataclass
class CanvasRateLimiter:
    """Sliding window rate limiter driven by Canvas X-Rate-Limit-Remaining header."""

    remaining: float = 700.0
    min_remaining: float = 50.0

    def update_from_headers(self, headers: httpx.Headers) -> None:
        """Read remaining quota from Canvas response headers."""
        raw = headers.get("x-rate-limit-remaining")
        if raw is not None:
            try:
                self.remaining = float(raw)
            except ValueError:
                pass

    async def wait_if_needed(self) -> None:
        """Throttle when remaining quota falls below safety buffer."""
        if self.remaining <= self.min_remaining:
            logger.warning(
                "canvas_rate_limit_throttle",
                remaining=self.remaining,
                min_remaining=self.min_remaining,
            )
            await asyncio.sleep(2.0)


@dataclass
class RetryConfig:
    """Exponential backoff retry configuration per TRD SS14.5."""

    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    retryable_statuses: set[int] = field(default_factory=lambda: {429, 500, 502, 503, 504})

    def get_delay(self, attempt: int) -> float:
        """Return exponential backoff delay: base * 2^attempt, capped at max_delay."""
        return float(min(self.base_delay * (2**attempt), self.max_delay))

    def is_retryable(self, status_code: int) -> bool:
        """Check whether a status code warrants a retry."""
        return status_code in self.retryable_statuses


async def execute_with_retry(
    func: Callable[[], Awaitable[httpx.Response]],
    retry_config: RetryConfig,
    circuit_breaker: CircuitBreaker | None = None,
) -> httpx.Response:
    """Execute an async HTTP call with retry, backoff, and optional circuit breaker.

    For 429 responses, honours the Retry-After header when present.
    Records success/failure on the circuit breaker after each attempt.
    """
    last_exc: Exception | None = None
    for attempt in range(retry_config.max_attempts):
        try:
            response = await func()
            if circuit_breaker is not None:
                circuit_breaker.record_success()
            return response
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if circuit_breaker is not None:
                circuit_breaker.record_failure()
            if not retry_config.is_retryable(status):
                raise
            # Determine delay: use Retry-After header for 429, else exponential
            delay: float
            if status == 429:
                retry_after = exc.response.headers.get("retry-after")
                if retry_after is not None:
                    try:
                        delay = float(retry_after)
                    except ValueError:
                        delay = retry_config.get_delay(attempt)
                else:
                    delay = retry_config.get_delay(attempt)
            else:
                delay = retry_config.get_delay(attempt)
            logger.warning(
                "request_retry",
                attempt=attempt + 1,
                max_attempts=retry_config.max_attempts,
                status_code=status,
                delay=delay,
            )
            last_exc = exc
            await asyncio.sleep(delay)
        except httpx.RequestError as exc:
            if circuit_breaker is not None:
                circuit_breaker.record_failure()
            last_exc = exc
            delay = retry_config.get_delay(attempt)
            logger.warning(
                "request_retry_network",
                attempt=attempt + 1,
                error=str(exc),
                delay=delay,
            )
            await asyncio.sleep(delay)

    if last_exc is not None:
        raise last_exc
    # Should be unreachable, but satisfy mypy
    msg = "Retry exhausted without exception"
    raise RuntimeError(msg)
