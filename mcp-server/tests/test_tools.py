"""Tests for MCP server resilience patterns, parser, and format helpers."""

import time
from unittest.mock import MagicMock

import httpx
import pytest

from uniboard_mcp.adapters.resilience import (
    CanvasRateLimiter,
    CircuitBreaker,
    CircuitState,
    RetryConfig,
)
from uniboard_mcp.adapters.ed_discussion import EdThreadResponse
from uniboard_mcp.adapters.ed_lessons import ED_FIELD_MAP, EdLessonResponse
from uniboard_mcp.parsers.unit_outline import AssessmentItem, UnitOutlineParser
from uniboard_mcp.server import (
    format_assignments,
    format_courses,
    format_grades,
    format_threads,
)

from .conftest import SAMPLE_OUTLINE_HTML


# --- Test 1: CircuitBreaker state transitions ---


class TestCircuitBreaker:
    def test_starts_closed(self, circuit_breaker: CircuitBreaker) -> None:
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.can_execute()

    def test_opens_after_threshold_failures(self, circuit_breaker: CircuitBreaker) -> None:
        for _ in range(3):  # threshold = 3
            circuit_breaker.record_failure()
        assert circuit_breaker.state == CircuitState.OPEN
        assert not circuit_breaker.can_execute()

    def test_half_open_after_recovery_timeout(self, circuit_breaker: CircuitBreaker) -> None:
        for _ in range(3):
            circuit_breaker.record_failure()
        assert circuit_breaker.state == CircuitState.OPEN

        # Simulate time passing beyond recovery_timeout
        circuit_breaker.last_failure_time = time.monotonic() - 2.0  # > 1.0s timeout
        assert circuit_breaker.can_execute()
        assert circuit_breaker.state == CircuitState.HALF_OPEN

    def test_success_resets_to_closed(self, circuit_breaker: CircuitBreaker) -> None:
        circuit_breaker.record_failure()
        circuit_breaker.record_failure()
        assert circuit_breaker.failure_count == 2
        circuit_breaker.record_success()
        assert circuit_breaker.failure_count == 0
        assert circuit_breaker.state == CircuitState.CLOSED

    def test_stays_closed_below_threshold(self, circuit_breaker: CircuitBreaker) -> None:
        circuit_breaker.record_failure()
        circuit_breaker.record_failure()
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.can_execute()


# --- Test 2: RetryConfig exponential backoff ---


class TestRetryConfig:
    def test_exponential_backoff(self, retry_config: RetryConfig) -> None:
        assert retry_config.get_delay(0) == 0.1  # base_delay * 2^0
        assert retry_config.get_delay(1) == 0.2  # base_delay * 2^1
        assert retry_config.get_delay(2) == 0.4  # base_delay * 2^2

    def test_backoff_capped_at_max(self) -> None:
        config = RetryConfig(base_delay=1.0, max_delay=5.0)
        assert config.get_delay(10) == 5.0  # capped

    def test_retryable_statuses(self, retry_config: RetryConfig) -> None:
        assert retry_config.is_retryable(429)
        assert retry_config.is_retryable(500)
        assert retry_config.is_retryable(502)
        assert retry_config.is_retryable(503)
        assert retry_config.is_retryable(504)
        assert not retry_config.is_retryable(200)
        assert not retry_config.is_retryable(404)


# --- Test 3: CanvasRateLimiter ---


class TestCanvasRateLimiter:
    def test_updates_from_headers(self, rate_limiter: CanvasRateLimiter) -> None:
        headers = httpx.Headers({"x-rate-limit-remaining": "150.0"})
        rate_limiter.update_from_headers(headers)
        assert rate_limiter.remaining == 150.0

    def test_ignores_invalid_headers(self, rate_limiter: CanvasRateLimiter) -> None:
        headers = httpx.Headers({"x-rate-limit-remaining": "not-a-number"})
        rate_limiter.update_from_headers(headers)
        assert rate_limiter.remaining == 700.0  # unchanged

    def test_ignores_missing_header(self, rate_limiter: CanvasRateLimiter) -> None:
        headers = httpx.Headers({})
        rate_limiter.update_from_headers(headers)
        assert rate_limiter.remaining == 700.0

    @pytest.mark.asyncio
    async def test_no_throttle_above_minimum(self, rate_limiter: CanvasRateLimiter) -> None:
        rate_limiter.remaining = 100.0
        start = time.monotonic()
        await rate_limiter.wait_if_needed()
        elapsed = time.monotonic() - start
        assert elapsed < 0.1  # no sleep

    @pytest.mark.asyncio
    async def test_throttles_below_minimum(self) -> None:
        limiter = CanvasRateLimiter(remaining=10.0, min_remaining=50.0)
        start = time.monotonic()
        await limiter.wait_if_needed()
        elapsed = time.monotonic() - start
        assert elapsed >= 1.5  # should sleep ~2s


# --- Test 4: UnitOutlineParser parse ---


class TestUnitOutlineParser:
    def test_parse_valid_html(self, parser: UnitOutlineParser) -> None:
        items = parser.parse(SAMPLE_OUTLINE_HTML)
        assert len(items) == 3
        assert items[0].name == "Quiz 1"
        assert items[0].weight == pytest.approx(0.20)
        assert items[1].name == "Assignment 1"
        assert items[1].weight == pytest.approx(0.30)
        assert items[2].name == "Final Exam"
        assert items[2].weight == pytest.approx(0.50)

    def test_parse_extracts_description(self, parser: UnitOutlineParser) -> None:
        items = parser.parse(SAMPLE_OUTLINE_HTML)
        assert items[0].description == "Multiple choice quiz on fundamentals"
        assert items[1].description == "Parallel algorithm implementation"

    def test_parse_extracts_due_date(self, parser: UnitOutlineParser) -> None:
        items = parser.parse(SAMPLE_OUTLINE_HTML)
        assert items[0].due_date == "Week 5"
        assert items[2].due_date == "Exam Period"

    def test_parse_empty_html(self, parser: UnitOutlineParser) -> None:
        items = parser.parse("<html><body></body></html>")
        assert items == []


# --- Test 5: validate_weights ---


class TestValidateWeights:
    def test_valid_weights(self, parser: UnitOutlineParser) -> None:
        items = [
            AssessmentItem(name="A", weight=0.30),
            AssessmentItem(name="B", weight=0.30),
            AssessmentItem(name="C", weight=0.40),
        ]
        assert parser.validate_weights(items) is True

    def test_invalid_weights_under(self, parser: UnitOutlineParser) -> None:
        items = [
            AssessmentItem(name="A", weight=0.30),
            AssessmentItem(name="B", weight=0.20),
        ]
        assert parser.validate_weights(items) is False

    def test_invalid_weights_over(self, parser: UnitOutlineParser) -> None:
        items = [
            AssessmentItem(name="A", weight=0.60),
            AssessmentItem(name="B", weight=0.60),
        ]
        assert parser.validate_weights(items) is False

    def test_approximate_valid(self, parser: UnitOutlineParser) -> None:
        # Allows 95-105% range
        items = [
            AssessmentItem(name="A", weight=0.33),
            AssessmentItem(name="B", weight=0.33),
            AssessmentItem(name="C", weight=0.33),
        ]
        assert parser.validate_weights(items) is True  # 99% is valid


# --- Test 6: EdDiscussionAdapter Pydantic validation ---


class TestEdDiscussionModels:
    def test_thread_response_extra_ignore(self) -> None:
        """Pydantic extra='ignore' doesn't crash on unknown fields."""
        data = {
            "id": 1,
            "title": "Test Thread",
            "unknown_field": "should not crash",
            "another_extra": 42,
        }
        thread = EdThreadResponse.model_validate(data)
        assert thread.id == 1
        assert thread.title == "Test Thread"
        assert not hasattr(thread, "unknown_field")

    def test_thread_response_defaults(self) -> None:
        data = {"id": 2, "title": "Minimal"}
        thread = EdThreadResponse.model_validate(data)
        assert thread.content == ""
        assert thread.is_endorsed is False
        assert thread.vote_count == 0


# --- Test 7: EdLessonsAdapter field map correctness ---


class TestEdLessonsFieldMap:
    def test_content_not_passage(self) -> None:
        assert ED_FIELD_MAP["content"] == "content"

    def test_number_not_lesson_number(self) -> None:
        assert ED_FIELD_MAP["number"] == "number"

    def test_user_id_not_creator_id(self) -> None:
        assert ED_FIELD_MAP["user_id"] == "user_id"

    def test_lesson_response_uses_correct_fields(self) -> None:
        data = {
            "id": 1,
            "title": "Lecture 1",
            "course_id": 100,
            "number": 1,
            "slides": [
                {
                    "id": 10,
                    "lesson_id": 1,
                    "content": "This is slide content",
                    "type": "document",
                }
            ],
        }
        lesson = EdLessonResponse.model_validate(data)
        assert lesson.number == 1
        assert lesson.slides[0].content == "This is slide content"


# --- Test 8: Server format helpers ---


class TestFormatHelpers:
    def test_format_courses_empty(self) -> None:
        assert format_courses([]) == "No active courses found."

    def test_format_courses_with_data(self) -> None:
        courses = [
            {"id": 1, "name": "COMP3221", "course_code": "COMP3221_2025_S1"},
            {"id": 2, "name": "INFO2222"},
        ]
        result = format_courses(courses)
        assert "2 active courses" in result
        assert "COMP3221" in result
        assert "COMP3221_2025_S1" in result

    def test_format_assignments_empty(self) -> None:
        result = format_assignments([], "123")
        assert "No assignments found" in result

    def test_format_assignments_with_data(self) -> None:
        assignments = [
            {"name": "Quiz 1", "due_at": "2025-04-01", "points_possible": 10},
        ]
        result = format_assignments(assignments, "123")
        assert "Quiz 1" in result
        assert "2025-04-01" in result
        assert "10" in result

    def test_format_grades_empty(self) -> None:
        result = format_grades([], "123")
        assert "No grade data" in result

    def test_format_threads_empty(self) -> None:
        result = format_threads([], "456")
        assert "No threads found" in result

    def test_format_threads_with_data(self) -> None:
        threads = [
            {"title": "Help with A1", "is_endorsed": True, "vote_count": 5},
            {"title": "General Q", "is_staff_answered": True, "vote_count": 2},
        ]
        result = format_threads(threads, "456")
        assert "Help with A1" in result
        assert "[ENDORSED]" in result
        assert "[STAFF ANSWERED]" in result
