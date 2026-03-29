"""Resilience utilities: circuit breaker, rate limiter, retry logic."""

import asyncio
import contextlib
import time
from dataclasses import dataclass, field
from enum import Enum

import httpx
import structlog

logger = structlog.get_logger()


class CircuitState(Enum):
    """Circuit breaker states."""

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
            with contextlib.suppress(ValueError):
                self.remaining = float(raw)

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
    """Exponential backoff retry configuration."""

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
