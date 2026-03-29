"""Unit tests for ROIService -- pure calculation helpers (no DB needed)."""

import pytest

from src.services.roi import ROIService

# ---------------------------------------------------------------------------
# Test _score_to_difficulty mapping
# ---------------------------------------------------------------------------


class TestScoreToDifficulty:
    """Map score/max_score ratio to 1-5 difficulty scale."""

    def test_high_score_easy(self) -> None:
        """Score ratio > 0.85 should map to easy difficulty (1.0-2.0)."""
        difficulty = ROIService._score_to_difficulty(0.92)
        assert 1.0 <= difficulty <= 2.0

    def test_mid_score_medium(self) -> None:
        """Score ratio 0.65-0.85 should map to medium difficulty (2.0-3.5)."""
        difficulty = ROIService._score_to_difficulty(0.75)
        assert 2.0 <= difficulty <= 3.5

    def test_low_score_hard(self) -> None:
        """Score ratio < 0.65 should map to hard difficulty (3.5-5.0)."""
        difficulty = ROIService._score_to_difficulty(0.40)
        assert 3.5 <= difficulty <= 5.0

    def test_perfect_score(self) -> None:
        """Perfect score (1.0) should be easiest difficulty."""
        difficulty = ROIService._score_to_difficulty(1.0)
        assert 1.0 <= difficulty <= 1.5

    def test_zero_score(self) -> None:
        """Zero score should be hardest difficulty."""
        difficulty = ROIService._score_to_difficulty(0.0)
        assert difficulty == 5.0

    def test_boundary_085(self) -> None:
        """Score exactly 0.85 should be in easy range."""
        difficulty = ROIService._score_to_difficulty(0.85)
        assert 1.0 <= difficulty <= 2.0

    def test_boundary_065(self) -> None:
        """Score exactly 0.65 should be in medium range."""
        difficulty = ROIService._score_to_difficulty(0.65)
        assert 2.0 <= difficulty <= 3.5


# ---------------------------------------------------------------------------
# Test _calculate_roi formula
# ---------------------------------------------------------------------------


class TestCalculateROI:
    """ROI = weight / (difficulty / 5.0). Higher = better investment."""

    def test_high_weight_low_difficulty(self) -> None:
        """High weight + low difficulty = high ROI."""
        roi = ROIService._calculate_roi(0.3, 1.0)
        # 0.3 / (1.0 / 5.0) = 0.3 / 0.2 = 1.5
        assert roi == pytest.approx(1.5)

    def test_low_weight_high_difficulty(self) -> None:
        """Low weight + high difficulty = low ROI."""
        roi = ROIService._calculate_roi(0.1, 5.0)
        # 0.1 / (5.0 / 5.0) = 0.1 / 1.0 = 0.1
        assert roi == pytest.approx(0.1)

    def test_graded_high_score_higher_roi_than_low(self) -> None:
        """Score 90/100 should have much higher ROI than score 40/100 at same weight."""
        diff_high = ROIService._score_to_difficulty(0.9)
        diff_low = ROIService._score_to_difficulty(0.4)
        roi_high = ROIService._calculate_roi(0.3, diff_high)
        roi_low = ROIService._calculate_roi(0.3, diff_low)
        # High score -> low difficulty -> high ROI (should be 2x+ more)
        assert roi_high > roi_low * 2

    def test_graded_low_score_lower_roi(self) -> None:
        """Score 40/100, weight 0.3 -> difficulty high, ROI relatively low."""
        difficulty = ROIService._score_to_difficulty(0.4)
        roi = ROIService._calculate_roi(0.3, difficulty)
        # With high difficulty (~4.x), ROI should be modest
        assert roi < 0.5

    def test_zero_weight(self) -> None:
        """Weight 0 should yield ROI 0."""
        roi = ROIService._calculate_roi(0.0, 3.0)
        assert roi == pytest.approx(0.0)

    def test_very_low_difficulty_floored(self) -> None:
        """Near-zero difficulty should be floored to avoid division by near-zero."""
        roi = ROIService._calculate_roi(0.3, 0.1)
        # floor(0.1, 0.2) = 0.2, so 0.3 / (0.2 / 5.0) = 0.3 / 0.04 = 7.5
        assert roi == pytest.approx(7.5)


# ---------------------------------------------------------------------------
# Test _generate_recommendation text
# ---------------------------------------------------------------------------


class TestGenerateRecommendation:
    """Human-readable recommendation based on ROI score."""

    def test_high_priority_high_roi(self) -> None:
        """ROI > 2 should include 'High priority'."""
        rec = ROIService._generate_recommendation(0.3, 1.0, 2.5)
        assert "High priority" in rec

    def test_low_priority_low_roi(self) -> None:
        """ROI < 0.5 should include 'Low priority'."""
        rec = ROIService._generate_recommendation(0.1, 5.0, 0.1)
        assert "Low priority" in rec

    def test_medium_priority(self) -> None:
        """0.5 <= ROI <= 2 should include 'Medium priority'."""
        rec = ROIService._generate_recommendation(0.2, 3.0, 1.0)
        assert "Medium priority" in rec

    def test_includes_weight_info(self) -> None:
        """Recommendation should mention weight percentage."""
        rec = ROIService._generate_recommendation(0.3, 2.0, 1.5)
        assert "30%" in rec


# ---------------------------------------------------------------------------
# Test ROI ranking and sorting
# ---------------------------------------------------------------------------


class TestROIRanking:
    """Assignments should be sorted by ROI descending."""

    def test_three_assignments_sorted(self) -> None:
        """3 assignments with different ROIs should be sorted descending."""
        items = [
            {"weight": 0.1, "difficulty": 3.0},  # ROI = 0.1 / 0.6 = 0.167
            {"weight": 0.3, "difficulty": 1.5},  # ROI = 0.3 / 0.3 = 1.0
            {"weight": 0.2, "difficulty": 4.0},  # ROI = 0.2 / 0.8 = 0.25
        ]
        rois = [
            ROIService._calculate_roi(i["weight"], i["difficulty"])
            for i in items
        ]
        sorted_indices = sorted(range(len(rois)), key=lambda i: rois[i], reverse=True)
        assert sorted_indices == [1, 2, 0]  # highest ROI first

    def test_weight_zero_excluded(self) -> None:
        """Assignments with weight 0 should have ROI 0."""
        roi = ROIService._calculate_roi(0.0, 2.0)
        assert roi == 0.0


# ---------------------------------------------------------------------------
# Test difficulty normalization scale
# ---------------------------------------------------------------------------


class TestDifficultyNormalization:
    """Score ratio mapped to 1-5 difficulty scale."""

    def test_monotonic_decreasing(self) -> None:
        """Higher score ratio should yield lower (easier) difficulty."""
        ratios = [0.95, 0.80, 0.70, 0.50, 0.30]
        difficulties = [ROIService._score_to_difficulty(r) for r in ratios]
        for i in range(len(difficulties) - 1):
            assert difficulties[i] <= difficulties[i + 1]

    def test_range_1_to_5(self) -> None:
        """All difficulty values should be within [1.0, 5.0]."""
        for ratio in [0.0, 0.25, 0.5, 0.75, 1.0]:
            d = ROIService._score_to_difficulty(ratio)
            assert 1.0 <= d <= 5.0


# ---------------------------------------------------------------------------
# Test default difficulty for ungraded
# ---------------------------------------------------------------------------


class TestDefaultDifficulty:
    """Ungraded assignments should use default difficulty 3.0."""

    def test_default_medium(self) -> None:
        """Default difficulty constant should be 3.0."""
        assert ROIService.DEFAULT_DIFFICULTY == 3.0
