"""Unit tests for DeadlineService pure functions and dedup logic."""

from datetime import UTC, datetime, timedelta

from src.services.deadline import (
    calculate_urgency,
    compute_dedup_key,
    extract_deadlines_from_text,
    find_near_duplicate,
    normalize_title,
)


class TestNormalizeTitle:
    """Tests for title normalization used in dedup key generation."""

    def test_strips_whitespace_and_lowercases(self) -> None:
        result = normalize_title("  Assignment 1 - Due Oct 15!  ")
        assert result == "assignment 1 due oct 15"

    def test_collapses_multiple_spaces(self) -> None:
        result = normalize_title("  Hello   World  ")
        assert result == "hello world"

    def test_removes_punctuation(self) -> None:
        result = normalize_title("Test: Assignment #1 (Final)")
        assert result == "test assignment 1 final"

    def test_empty_string(self) -> None:
        result = normalize_title("")
        assert result == ""


class TestComputeDedupKey:
    """Tests for SHA-256 dedup key computation."""

    def test_deterministic(self) -> None:
        key1 = compute_dedup_key("COMP2017", "Assignment 1", "2026-03-20")
        key2 = compute_dedup_key("COMP2017", "Assignment 1", "2026-03-20")
        assert key1 == key2

    def test_different_for_different_titles(self) -> None:
        key1 = compute_dedup_key("COMP2017", "Assignment 1", "2026-03-20")
        key2 = compute_dedup_key("COMP2017", "Assignment 2", "2026-03-20")
        assert key1 != key2

    def test_different_for_different_courses(self) -> None:
        key1 = compute_dedup_key("COMP2017", "Assignment 1", "2026-03-20")
        key2 = compute_dedup_key("INFO1110", "Assignment 1", "2026-03-20")
        assert key1 != key2

    def test_case_insensitive_course_code(self) -> None:
        key1 = compute_dedup_key("comp2017", "Assignment 1", "2026-03-20")
        key2 = compute_dedup_key("COMP2017", "Assignment 1", "2026-03-20")
        assert key1 == key2

    def test_is_sha256_hex(self) -> None:
        key = compute_dedup_key("COMP2017", "Assignment 1", "2026-03-20")
        assert len(key) == 64  # SHA-256 hex digest length


class TestFindNearDuplicate:
    """Tests for fuzzy matching with rapidfuzz."""

    def test_fuzzy_match_similar_titles(self) -> None:
        """'Assignment 1 - Due Oct 15' vs 'Assignment 1' should match."""
        from unittest.mock import MagicMock

        existing = MagicMock()
        existing.title = "Assignment 1"
        result = find_near_duplicate("Assignment 1 - Due Oct 15", [existing])
        assert result is not None

    def test_no_match_different_assignments(self) -> None:
        """'Assignment 1' vs 'Assignment 2' should NOT match."""
        from unittest.mock import MagicMock

        existing = MagicMock()
        existing.title = "Assignment 2"
        result = find_near_duplicate("Assignment 1", [existing])
        assert result is None

    def test_empty_list_returns_none(self) -> None:
        result = find_near_duplicate("Assignment 1", [])
        assert result is None


class TestCalculateUrgency:
    """Tests for urgency level calculation based on time delta."""

    def test_past_due(self) -> None:
        past = datetime.now(UTC) - timedelta(hours=1)
        assert calculate_urgency(past) == "past_due"

    def test_urgent(self) -> None:
        soon = datetime.now(UTC) + timedelta(hours=12)
        assert calculate_urgency(soon) == "urgent"

    def test_warning(self) -> None:
        upcoming = datetime.now(UTC) + timedelta(hours=48)
        assert calculate_urgency(upcoming) == "warning"

    def test_normal(self) -> None:
        future = datetime.now(UTC) + timedelta(days=5)
        assert calculate_urgency(future) == "normal"

    def test_naive_datetime_treated_as_utc(self) -> None:
        future = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=5)
        assert calculate_urgency(future) == "normal"


class TestExtractDeadlinesFromText:
    """Tests for regex deadline extraction from Ed Discussion posts."""

    def test_due_by_pattern(self) -> None:
        text = "This assignment is due by October 15."
        result = extract_deadlines_from_text(text)
        assert len(result) >= 1
        assert "October 15" in result[0]

    def test_iso_date_pattern(self) -> None:
        text = "The deadline is 2026-03-20 for submission."
        result = extract_deadlines_from_text(text)
        assert "2026-03-20" in result

    def test_no_match(self) -> None:
        text = "Good question about the lecture content!"
        result = extract_deadlines_from_text(text)
        assert result == []

    def test_submit_by_pattern(self) -> None:
        text = "Please submit by March 20."
        result = extract_deadlines_from_text(text)
        assert len(result) >= 1

    def test_multiple_patterns(self) -> None:
        text = "Due by October 15. Also 2026-11-01 is another date."
        result = extract_deadlines_from_text(text)
        assert len(result) >= 2
