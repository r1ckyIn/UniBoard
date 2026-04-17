"""Pydantic schemas for study recommendation endpoint.

Phase 34 AIFEAT-01: cross-course Top-3 ranking + 20-30 word AI main suggestion.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class StudyCandidate(BaseModel):
    """Single ranked study candidate (assessment-level)."""

    model_config = ConfigDict(from_attributes=True)

    course_code: str
    assessment_name: str
    weight: float  # 0-1
    days_until_due: float
    roi_score: float
    score: float  # composite ranking: urgency * weight * sqrt(roi)


class StudyRecommendationResponse(BaseModel):
    """Daily cached recommendation result (per phase 34 D-A2)."""

    model_config = ConfigDict(from_attributes=True)

    generated_for_date: str  # ISO 8601 date
    main_suggestion: str  # 20-30 word LLM output; "" on AI fallback per D-D1
    top_3: list[StudyCandidate]
    language: str  # "en" | "zh"
