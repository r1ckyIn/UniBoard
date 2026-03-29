"""Pydantic schemas for Assignment ROI analysis."""

from pydantic import BaseModel, ConfigDict


class AssignmentROI(BaseModel):
    """Single assignment ROI analysis result."""

    model_config = ConfigDict(from_attributes=True)

    assessment_name: str
    weight: float  # 0.0-1.0
    difficulty: float  # 1.0 (easy) - 5.0 (hard)
    difficulty_source: str  # "historical" | "ai_inference" | "default"
    roi_score: float  # weight / normalized_difficulty
    recommendation: str  # "High priority: 30% weight, estimated easy"
    score: float | None = None  # actual score if graded
    max_score: float | None = None
    due_date: str | None = None


class CourseROIResponse(BaseModel):
    """ROI analysis for all assignments in a course."""

    course_id: str
    course_code: str
    course_name: str
    assignments: list[AssignmentROI]  # sorted by roi_score DESC
    has_ai_estimates: bool  # true if any AI difficulty used
