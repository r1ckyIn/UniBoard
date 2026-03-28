"""Quality gate service for monitoring AI evaluation accuracy via user feedback."""

from __future__ import annotations

from datetime import datetime

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ai_feedback import AIFeedback, AIQualityMetrics

logger = structlog.get_logger()

# Minimum feedback entries required before F1 calculation (D-02)
FEEDBACK_THRESHOLD = 50

# F1 score below which the system falls back to rule engine (D-03)
F1_THRESHOLD = 0.75

# AI considers a thread high-value if gpa_relevance >= this score
HIGH_VALUE_SCORE_THRESHOLD = 0.4


class QualityGateService:
    """Monitor AI evaluation quality and trigger fallback when F1 drops."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def calculate_f1(self, total: int | None = None) -> tuple[float, float, float]:
        """Calculate precision, recall, and F1 from user feedback.

        Returns (precision, recall, f1). Returns (0.0, 0.0, 0.0) when
        total feedback is below FEEDBACK_THRESHOLD.

        Classification logic:
        - TP: thumbs_up on thread with gpa_relevance >= 0.4 (AI correct: high-value)
        - FP: thumbs_down on high-value thread (AI wrong: user disagrees)
        - FN: thumbs_up on thread with gpa_relevance < 0.4 (AI wrong: missed high-value thread)
        - TN: thumbs_down on thread with gpa_relevance < 0.4 (AI correct: low-value)
        """
        if total is None:
            count_stmt = select(func.count()).select_from(AIFeedback)
            count_result = await self._session.execute(count_stmt)
            total = count_result.scalar_one()

        if total < FEEDBACK_THRESHOLD:
            return 0.0, 0.0, 0.0

        # Query all feedback with thread scores
        from src.models.discussion import DiscussionThread

        stmt = select(
            AIFeedback.feedback_type,
            DiscussionThread.gpa_relevance_score,
        ).join(
            DiscussionThread,
            AIFeedback.thread_id == DiscussionThread.id,
        )
        result = await self._session.execute(stmt)
        rows = result.all()

        tp = 0
        fp = 0
        fn = 0

        for row in rows:
            is_high_value = row.gpa_relevance_score >= HIGH_VALUE_SCORE_THRESHOLD
            is_thumbs_up = row.feedback_type == "thumbs_up"

            if is_high_value and is_thumbs_up:
                tp += 1
            elif is_high_value and not is_thumbs_up:
                fp += 1
            elif not is_high_value and is_thumbs_up:
                fn += 1
            # TN: not is_high_value and not is_thumbs_up -> ignored for F1

        # Guard against division by zero
        precision_denom = tp + fp
        recall_denom = tp + fn

        precision = tp / precision_denom if precision_denom > 0 else 0.0
        recall = tp / recall_denom if recall_denom > 0 else 0.0

        f1_denom = precision + recall
        f1 = 2 * precision * recall / f1_denom if f1_denom > 0 else 0.0

        return precision, recall, f1

    async def check_and_update_fallback(self, total: int | None = None) -> None:
        """Evaluate F1 and create a new AIQualityMetrics snapshot.

        Only creates a metrics row when total feedback >= FEEDBACK_THRESHOLD.
        Sets is_fallback_active=True when F1 < 0.75 (D-03).
        """
        if total is None:
            count_stmt = select(func.count()).select_from(AIFeedback)
            count_result = await self._session.execute(count_stmt)
            total = count_result.scalar_one()

        if total < FEEDBACK_THRESHOLD:
            return

        precision, recall, f1 = await self.calculate_f1(total=total)
        is_fallback = f1 < F1_THRESHOLD

        metrics = AIQualityMetrics(
            total_feedback=total,
            f1_score=f1,
            precision=precision,
            recall=recall,
            calculated_at=datetime.utcnow(),  # noqa: DTZ003
            is_fallback_active=is_fallback,
        )
        self._session.add(metrics)
        await self._session.flush()

        logger.info(
            "quality_gate_updated",
            f1=f1,
            precision=precision,
            recall=recall,
            is_fallback_active=is_fallback,
        )

    async def is_fallback_active(self) -> bool:
        """Check whether the AI quality gate fallback is currently active.

        Reads the latest AIQualityMetrics row. Returns False if no metrics exist.
        """
        stmt = (
            select(AIQualityMetrics)
            .order_by(AIQualityMetrics.calculated_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return False
        return bool(row.is_fallback_active)

