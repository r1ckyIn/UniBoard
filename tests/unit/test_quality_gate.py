"""Unit tests for QualityGateService -- F1 calculation and fallback logic."""

from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest


def _make_feedback_row(
    feedback_type: str,
    gpa_relevance_score: float,
) -> MagicMock:
    """Build a mock row representing AIFeedback joined with DiscussionThread."""
    row = MagicMock()
    row.feedback_type = feedback_type
    row.gpa_relevance_score = gpa_relevance_score
    return row


def _make_metrics_row(
    is_fallback_active: bool,
    f1_score: float = 0.8,
) -> MagicMock:
    """Build a mock AIQualityMetrics row."""
    row = MagicMock()
    row.is_fallback_active = is_fallback_active
    row.f1_score = f1_score
    row.calculated_at = datetime(2026, 3, 28)
    return row


@pytest.mark.asyncio(loop_scope="session")
async def test_calculate_f1_insufficient_feedback() -> None:
    """calculate_f1 returns (0.0, 0.0, 0.0) when total feedback < 50 (D-02)."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()

    # First query: count of feedback rows = 30 (below threshold of 50)
    mock_count_result = MagicMock()
    mock_count_result.scalar_one = MagicMock(return_value=30)
    mock_session.execute = AsyncMock(return_value=mock_count_result)

    svc = QualityGateService(mock_session)
    precision, recall, f1 = await svc.calculate_f1()

    assert precision == 0.0
    assert recall == 0.0
    assert f1 == 0.0


@pytest.mark.asyncio(loop_scope="session")
async def test_calculate_f1_correct_computation() -> None:
    """calculate_f1 correctly computes precision, recall, F1 from TP/FP/FN counts."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()

    # Build feedback rows: TP=40, FP=5, FN=5 -> P=40/45=0.889, R=40/45=0.889, F1=0.889
    rows: list[MagicMock] = []
    # TP: thumbs_up on high-value (>= 0.4)
    for _ in range(40):
        rows.append(_make_feedback_row("thumbs_up", 0.8))
    # FP: thumbs_down on high-value (AI said high, user disagrees)
    for _ in range(5):
        rows.append(_make_feedback_row("thumbs_down", 0.6))
    # FN: thumbs_up on low-value (AI said low, user says should be high)
    for _ in range(5):
        rows.append(_make_feedback_row("thumbs_up", 0.2))

    # First call: count = 50 (meets threshold)
    mock_count_result = MagicMock()
    mock_count_result.scalar_one = MagicMock(return_value=50)

    # Second call: actual feedback rows
    mock_rows_result = MagicMock()
    mock_rows_result.all = MagicMock(return_value=rows)

    mock_session.execute = AsyncMock(
        side_effect=[mock_count_result, mock_rows_result]
    )

    svc = QualityGateService(mock_session)
    precision, recall, f1 = await svc.calculate_f1()

    assert abs(precision - 40.0 / 45.0) < 0.01
    assert abs(recall - 40.0 / 45.0) < 0.01
    assert abs(f1 - 40.0 / 45.0) < 0.01  # When P==R, F1==P==R


@pytest.mark.asyncio(loop_scope="session")
async def test_fallback_activates_below_threshold() -> None:
    """check_and_update_fallback sets is_fallback_active=True when F1 < 0.75 (D-03)."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()

    svc = QualityGateService(mock_session)

    # Build rows with poor F1: TP=20, FP=20, FN=20 -> P=0.5, R=0.5, F1=0.5
    rows: list[MagicMock] = []
    for _ in range(20):
        rows.append(_make_feedback_row("thumbs_up", 0.8))  # TP
    for _ in range(20):
        rows.append(_make_feedback_row("thumbs_down", 0.6))  # FP
    for _ in range(20):
        rows.append(_make_feedback_row("thumbs_up", 0.2))  # FN

    mock_count_result = MagicMock()
    mock_count_result.scalar_one = MagicMock(return_value=60)

    mock_rows_result = MagicMock()
    mock_rows_result.all = MagicMock(return_value=rows)

    # check_and_update_fallback flow: count -> calculate_f1(count -> rows)
    mock_session.execute = AsyncMock(
        side_effect=[mock_count_result, mock_count_result, mock_rows_result]
    )

    await svc.check_and_update_fallback()

    # Should have added a metrics row with is_fallback_active=True
    mock_session.add.assert_called_once()
    added_obj = mock_session.add.call_args[0][0]
    assert added_obj.is_fallback_active is True
    assert added_obj.f1_score < 0.75


@pytest.mark.asyncio(loop_scope="session")
async def test_fallback_deactivates_above_threshold() -> None:
    """check_and_update_fallback sets is_fallback_active=False when F1 >= 0.75."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()

    svc = QualityGateService(mock_session)

    # Build rows with good F1: TP=45, FP=3, FN=2 -> P=45/48, R=45/47, F1>0.75
    rows: list[MagicMock] = []
    for _ in range(45):
        rows.append(_make_feedback_row("thumbs_up", 0.8))  # TP
    for _ in range(3):
        rows.append(_make_feedback_row("thumbs_down", 0.6))  # FP
    for _ in range(2):
        rows.append(_make_feedback_row("thumbs_up", 0.2))  # FN

    mock_count_result = MagicMock()
    mock_count_result.scalar_one = MagicMock(return_value=50)

    mock_rows_result = MagicMock()
    mock_rows_result.all = MagicMock(return_value=rows)

    # check_and_update_fallback flow: count -> calculate_f1(count -> rows)
    mock_session.execute = AsyncMock(
        side_effect=[mock_count_result, mock_count_result, mock_rows_result]
    )

    await svc.check_and_update_fallback()

    mock_session.add.assert_called_once()
    added_obj = mock_session.add.call_args[0][0]
    assert added_obj.is_fallback_active is False
    assert added_obj.f1_score >= 0.75


@pytest.mark.asyncio(loop_scope="session")
async def test_is_fallback_active_reads_latest_metrics() -> None:
    """is_fallback_active reads latest ai_quality_metrics row."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()

    metrics_row = _make_metrics_row(is_fallback_active=True)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=metrics_row)
    mock_session.execute = AsyncMock(return_value=mock_result)

    svc = QualityGateService(mock_session)
    result = await svc.is_fallback_active()

    assert result is True


@pytest.mark.asyncio(loop_scope="session")
async def test_is_fallback_active_returns_false_when_no_metrics() -> None:
    """is_fallback_active returns False when no metrics rows exist."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=None)
    mock_session.execute = AsyncMock(return_value=mock_result)

    svc = QualityGateService(mock_session)
    result = await svc.is_fallback_active()

    assert result is False


@pytest.mark.asyncio(loop_scope="session")
async def test_f1_zero_denominator_no_division_error() -> None:
    """F1 with zero denominator returns 0.0 (no division by zero)."""
    from src.services.quality_gate import QualityGateService

    mock_session = AsyncMock()

    # All TN (thumbs_down on low-value) -> TP=0, FP=0, FN=0 -> all denominators zero
    rows: list[MagicMock] = []
    for _ in range(50):
        rows.append(_make_feedback_row("thumbs_down", 0.2))  # TN

    mock_count_result = MagicMock()
    mock_count_result.scalar_one = MagicMock(return_value=50)

    mock_rows_result = MagicMock()
    mock_rows_result.all = MagicMock(return_value=rows)

    mock_session.execute = AsyncMock(
        side_effect=[mock_count_result, mock_rows_result]
    )

    svc = QualityGateService(mock_session)
    precision, recall, f1 = await svc.calculate_f1()

    # No division by zero
    assert precision == 0.0
    assert recall == 0.0
    assert f1 == 0.0
