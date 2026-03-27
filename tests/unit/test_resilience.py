"""Unit tests for the resilience module: CircuitBreaker, CanvasRateLimiter, RetryConfig, execute_with_retry."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.adapters.resilience import (
    CanvasRateLimiter,
    CircuitBreaker,
    CircuitState,
    RetryConfig,
    execute_with_retry,
)


# --- CircuitBreaker tests ---


class TestCircuitBreaker:
    """Test CircuitBreaker state machine transitions."""

    def test_circuit_breaker_starts_closed(self) -> None:
        """New CircuitBreaker has state CLOSED and can_execute returns True."""
        cb = CircuitBreaker()
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute() is True

    def test_circuit_breaker_stays_closed_below_threshold(self) -> None:
        """4 failures (below default 5 threshold) keeps state CLOSED."""
        cb = CircuitBreaker()
        for _ in range(4):
            cb.record_failure()
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute() is True

    def test_circuit_breaker_opens_at_threshold(self) -> None:
        """5 failures transitions to OPEN, can_execute returns False."""
        cb = CircuitBreaker()
        for _ in range(5):
            cb.record_failure()
        assert cb.state == CircuitState.OPEN
        assert cb.can_execute() is False

    @patch("time.monotonic")
    def test_circuit_breaker_half_open_after_recovery(
        self, mock_monotonic: AsyncMock
    ) -> None:
        """OPEN + elapsed >= recovery_timeout -> HALF_OPEN, can_execute True."""
        cb = CircuitBreaker(recovery_timeout=10.0)

        # Record failures to open the circuit at time=100
        mock_monotonic.return_value = 100.0
        for _ in range(5):
            cb.record_failure()
        assert cb.state == CircuitState.OPEN

        # After recovery_timeout has passed (time=111 > 100+10)
        mock_monotonic.return_value = 111.0
        assert cb.can_execute() is True
        assert cb.state == CircuitState.HALF_OPEN

    def test_circuit_breaker_closes_on_success(self) -> None:
        """HALF_OPEN + record_success -> CLOSED, failure_count 0."""
        cb = CircuitBreaker()
        cb.state = CircuitState.HALF_OPEN
        cb.failure_count = 5

        cb.record_success()

        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_circuit_breaker_reopens_on_failure_in_half_open(self) -> None:
        """HALF_OPEN + record_failure at threshold -> OPEN."""
        cb = CircuitBreaker(failure_threshold=5)
        cb.state = CircuitState.HALF_OPEN
        cb.failure_count = 4  # One more failure hits threshold

        cb.record_failure()

        assert cb.state == CircuitState.OPEN
        assert cb.failure_count == 5


# --- CanvasRateLimiter tests ---


class TestCanvasRateLimiter:
    """Test CanvasRateLimiter throttle and header update logic."""

    async def test_rate_limiter_no_throttle_above_minimum(self) -> None:
        """remaining=500 -> wait_if_needed returns immediately (no sleep)."""
        rl = CanvasRateLimiter(remaining=500.0)
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            await rl.wait_if_needed()
            mock_sleep.assert_not_called()

    async def test_rate_limiter_throttles_below_minimum(self) -> None:
        """remaining=30 (below 50) -> wait_if_needed sleeps 2.0s."""
        rl = CanvasRateLimiter(remaining=30.0)
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            await rl.wait_if_needed()
            mock_sleep.assert_called_once_with(2.0)

    def test_rate_limiter_update_from_headers(self) -> None:
        """Headers with x-rate-limit-remaining='123' -> remaining becomes 123.0."""
        rl = CanvasRateLimiter()
        headers = httpx.Headers({"x-rate-limit-remaining": "123"})
        rl.update_from_headers(headers)
        assert rl.remaining == 123.0

    def test_rate_limiter_ignores_missing_header(self) -> None:
        """Headers without x-rate-limit-remaining -> remaining unchanged."""
        rl = CanvasRateLimiter(remaining=700.0)
        headers = httpx.Headers({"content-type": "application/json"})
        rl.update_from_headers(headers)
        assert rl.remaining == 700.0


# --- RetryConfig tests ---


class TestRetryConfig:
    """Test RetryConfig exponential backoff and retryable status logic."""

    def test_retry_config_get_delay_exponential(self) -> None:
        """Exponential backoff: attempt 0->1.0, 1->2.0, 2->4.0."""
        rc = RetryConfig(base_delay=1.0)
        assert rc.get_delay(0) == 1.0
        assert rc.get_delay(1) == 2.0
        assert rc.get_delay(2) == 4.0

    def test_retry_config_get_delay_capped(self) -> None:
        """Attempt 10 returns max_delay (30.0), not 1024.0."""
        rc = RetryConfig(base_delay=1.0, max_delay=30.0)
        assert rc.get_delay(10) == 30.0

    def test_retry_config_is_retryable(self) -> None:
        """429, 500, 502, 503, 504 are retryable; 200, 400, 401 are not."""
        rc = RetryConfig()
        for code in (429, 500, 502, 503, 504):
            assert rc.is_retryable(code) is True, f"{code} should be retryable"
        for code in (200, 400, 401):
            assert rc.is_retryable(code) is False, f"{code} should not be retryable"


# --- execute_with_retry tests ---


class TestExecuteWithRetry:
    """Test execute_with_retry with mock async callables."""

    async def test_execute_with_retry_success(self) -> None:
        """func returns 200 -> returns response, circuit_breaker.record_success called."""
        response = httpx.Response(200)
        func = AsyncMock(return_value=response)
        cb = CircuitBreaker()
        rc = RetryConfig()

        result = await execute_with_retry(func, rc, circuit_breaker=cb)

        assert result.status_code == 200
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0
        func.assert_called_once()

    async def test_execute_with_retry_retries_on_5xx(self) -> None:
        """func raises HTTPStatusError(500) twice then succeeds -> 3 calls total."""
        request = httpx.Request("GET", "http://test")
        error_response = httpx.Response(500, request=request)
        success_response = httpx.Response(200)

        func = AsyncMock(
            side_effect=[
                httpx.HTTPStatusError(
                    "Server Error", request=request, response=error_response
                ),
                httpx.HTTPStatusError(
                    "Server Error", request=request, response=error_response
                ),
                success_response,
            ]
        )
        cb = CircuitBreaker()
        rc = RetryConfig(base_delay=0.01, max_delay=0.1)  # Fast retries for tests

        result = await execute_with_retry(func, rc, circuit_breaker=cb)

        assert result.status_code == 200
        assert func.call_count == 3

    async def test_execute_with_retry_uses_retry_after_header(self) -> None:
        """429 with Retry-After: 5 -> sleeps 5.0 instead of exponential."""
        request = httpx.Request("GET", "http://test")
        error_response = httpx.Response(
            429, request=request, headers={"retry-after": "5"}
        )
        success_response = httpx.Response(200)

        func = AsyncMock(
            side_effect=[
                httpx.HTTPStatusError(
                    "Rate Limited", request=request, response=error_response
                ),
                success_response,
            ]
        )
        rc = RetryConfig()

        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            # We need to replace the real asyncio.sleep in resilience module
            with patch("src.adapters.resilience.asyncio.sleep", new_callable=AsyncMock) as mock_res_sleep:
                result = await execute_with_retry(func, rc)

                assert result.status_code == 200
                # The retry sleep should use the Retry-After value of 5.0
                mock_res_sleep.assert_called_once_with(5.0)

    async def test_execute_with_retry_exhausts_retries(self) -> None:
        """All retries exhausted raises the last exception."""
        request = httpx.Request("GET", "http://test")
        error_response = httpx.Response(500, request=request)

        func = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "Server Error", request=request, response=error_response
            )
        )
        rc = RetryConfig(max_attempts=2, base_delay=0.01, max_delay=0.1)

        with patch("src.adapters.resilience.asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(httpx.HTTPStatusError):
                await execute_with_retry(func, rc)

        assert func.call_count == 2
