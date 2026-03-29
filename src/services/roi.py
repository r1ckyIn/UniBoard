"""Assignment ROI analysis service.

Ranks assignments by ROI (weight / normalized_difficulty) to help students
identify high-weight, low-difficulty assessments for effort optimization.
"""

from __future__ import annotations

import json
import os
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.course import Course
from src.prompts.roi import DIFFICULTY_SYSTEM_PROMPT, get_difficulty_prompt
from src.schemas.common import NotFoundError
from src.schemas.roi import AssignmentROI, CourseROIResponse

logger = structlog.get_logger()


class ROIService:
    """Analyze assignment ROI (weight / difficulty) for a course.

    Uses historical grades as primary signal for difficulty estimation.
    Falls back to AI inference for ungraded assignments when API key available,
    otherwise defaults to medium difficulty (3.0).
    """

    # Default difficulty for ungraded assignments when AI is unavailable
    DEFAULT_DIFFICULTY: float = 3.0

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Pure calculation helpers (static, testable without DB)
    # ------------------------------------------------------------------

    @staticmethod
    def _score_to_difficulty(score_ratio: float) -> float:
        """Map score/max_score ratio to 1-5 difficulty scale.

        High score (>0.85) = easy (1.0-2.0)
        Mid score (0.65-0.85) = medium (2.0-3.5)
        Low score (<0.65) = hard (3.5-5.0)

        Uses linear interpolation within each band for smooth transitions.
        """
        if score_ratio >= 0.85:
            # Map [0.85, 1.0] -> [2.0, 1.0]
            t = (score_ratio - 0.85) / 0.15
            result = 2.0 - t * 1.0
        elif score_ratio >= 0.65:
            # Map [0.65, 0.85] -> [3.5, 2.0]
            t = (score_ratio - 0.65) / 0.20
            result = 3.5 - t * 1.5
        else:
            # Map [0.0, 0.65] -> [5.0, 3.5]
            t = score_ratio / 0.65 if score_ratio > 0 else 0.0
            result = 5.0 - t * 1.5

        # Clamp to valid range to avoid floating-point drift
        return max(1.0, min(5.0, result))

    @staticmethod
    def _calculate_roi(weight: float, difficulty: float) -> float:
        """ROI = weight / (difficulty / 5.0). Higher = better investment.

        Difficulty is floored at 0.2 to avoid division by near-zero.
        """
        normalized = max(difficulty, 0.2) / 5.0
        return weight / normalized

    @staticmethod
    def _generate_recommendation(
        weight: float, difficulty: float, roi: float
    ) -> str:
        """Human-readable recommendation based on ROI score."""
        weight_pct = round(weight * 100)

        if difficulty <= 2.0:
            diff_label = "estimated easy"
        elif difficulty <= 3.5:
            diff_label = "moderate difficulty"
        else:
            diff_label = "estimated hard"

        if roi > 2.0:
            priority = "High priority"
        elif roi >= 0.5:
            priority = "Medium priority"
        else:
            priority = "Low priority"

        return f"{priority}: {weight_pct}% weight, {diff_label}"

    # ------------------------------------------------------------------
    # AI difficulty inference
    # ------------------------------------------------------------------

    async def _ai_difficulty(
        self,
        name: str,
        description: str | None,
        thread_count: int = 0,
        assignment_type: str = "unknown",
    ) -> tuple[float, str]:
        """Infer difficulty via Claude API. Returns (difficulty, source).

        Falls back to default difficulty (3.0) if:
        - ANTHROPIC_API_KEY not set
        - API call fails
        - Confidence < 50%
        """
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return self.DEFAULT_DIFFICULTY, "default"

        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=api_key)
            user_msg = get_difficulty_prompt(
                name, description, thread_count, assignment_type
            )

            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                system=DIFFICULTY_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )

            raw_text: str = response.content[0].text  # type: ignore[union-attr]
            data = json.loads(raw_text)

            difficulty = float(data.get("difficulty", self.DEFAULT_DIFFICULTY))
            confidence = int(data.get("confidence", 0))

            # Quality gate: low confidence -> default
            if confidence < 50:
                logger.info(
                    "ai_difficulty_low_confidence",
                    assignment=name,
                    confidence=confidence,
                )
                return self.DEFAULT_DIFFICULTY, "default"

            # Clamp to valid range
            difficulty = max(1.0, min(5.0, difficulty))
            return difficulty, "ai_inference"

        except Exception:
            logger.warning("ai_difficulty_failed", assignment=name, exc_info=True)
            return self.DEFAULT_DIFFICULTY, "default"

    # ------------------------------------------------------------------
    # Main service method
    # ------------------------------------------------------------------

    async def get_course_roi(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> CourseROIResponse:
        """Compute ROI analysis for all assessments in a course.

        1. Load course with grades and deadlines
        2. For each assessment:
           a. If graded: difficulty from score/max_score ratio
           b. If ungraded: AI inference or default 3.0
        3. Calculate ROI = weight / (difficulty / 5.0)
        4. Sort by ROI descending
        5. Generate recommendation text
        """
        stmt = (
            select(Course)
            .where(Course.id == course_id, Course.user_id == user_id)
            .options(
                selectinload(Course.grades),
                selectinload(Course.unified_deadlines),
            )
        )
        result = await self._session.execute(stmt)
        course = result.scalar_one_or_none()
        if course is None:
            raise NotFoundError("Course")

        # Build deadline lookup for due_date matching
        deadline_by_title: dict[str, str] = {}
        for dl in course.unified_deadlines:
            deadline_by_title[dl.title.lower()] = dl.due_date.isoformat()

        has_ai = False
        assignments: list[AssignmentROI] = []

        for grade in course.grades:
            # Skip zero-weight assessments (no ROI contribution)
            if grade.weight == 0:
                continue

            if grade.score is not None and grade.max_score > 0:
                # Historical difficulty from actual score
                ratio = grade.score / grade.max_score
                difficulty = self._score_to_difficulty(ratio)
                source = "historical"
            else:
                # AI inference or default for ungraded
                difficulty, source = await self._ai_difficulty(
                    grade.assessment_name,
                    None,  # grades don't have description
                )
                if source == "ai_inference":
                    has_ai = True

            roi_score = self._calculate_roi(grade.weight, difficulty)
            recommendation = self._generate_recommendation(
                grade.weight, difficulty, roi_score
            )

            # Try to match a deadline for due_date
            due_date = deadline_by_title.get(grade.assessment_name.lower())

            assignments.append(
                AssignmentROI(
                    assessment_name=grade.assessment_name,
                    weight=grade.weight,
                    difficulty=round(difficulty, 2),
                    difficulty_source=source,
                    roi_score=round(roi_score, 4),
                    recommendation=recommendation,
                    score=grade.score,
                    max_score=grade.max_score,
                    due_date=due_date,
                )
            )

        # Sort by ROI descending
        assignments.sort(key=lambda a: a.roi_score, reverse=True)

        return CourseROIResponse(
            course_id=str(course.id),
            course_code=course.code,
            course_name=course.name,
            assignments=assignments,
            has_ai_estimates=has_ai,
        )
