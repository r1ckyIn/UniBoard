"""Pydantic schemas for /courses endpoints matching OpenAPI contract."""

from pydantic import BaseModel, ConfigDict


class AssessmentWeightResponse(BaseModel):
    """Single assessment weight entry for course detail view."""

    name: str
    weight: float
    score: float | None = None
    max_score: float
    status: str  # "graded" | "upcoming" | "submitted"
    group_name: str
    due_date: str | None = None


class CourseResponse(BaseModel):
    """Course list item matching frontend Course type."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    semester: str
    credit_points: int
    canvas_course_id: str | None = None
    ed_course_id: str | None = None
    current_mark: float | None = None
    grade_letter: str | None = None
    completed_weight: float | None = None
    has_unit_outline: bool | None = None
    last_sync_at: str | None = None


class CourseDetailResponse(CourseResponse):
    """Course detail extending CourseResponse with assessment weights."""

    assessment_weights: list[AssessmentWeightResponse]
    weight_source: str  # "unit_outline" | "canvas_assignment_groups"


class GradeResponse(BaseModel):
    """Single grade record matching frontend Grade type."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    assessment_name: str
    score: float
    max_score: float
    weight: float
    group_name: str
    graded_at: str
    submitted_at: str


class CourseDeadlineResponse(BaseModel):
    """Deadline scoped to a course path (no course_code/course_name needed)."""

    id: str
    title: str
    due_date: str
    source: str
    weight: float | None = None
    status: str  # "upcoming" | "submitted" | "overdue" | "completed"
    days_remaining: int


class OutlineAssessmentResponse(BaseModel):
    """Single assessment from unit outline."""

    name: str
    weight: float
    description: str
    due_date: str | None = None
    length: str | None = None
    ai_policy: str | None = None


class CourseOutlineResponse(BaseModel):
    """Course outline matching frontend CourseOutline type."""

    course_id: str
    outline_url: str | None = None
    assessments: list[OutlineAssessmentResponse]
    learning_outcomes: list[str]
    fetched_at: str
    source: str  # "unit_outline" | "canvas_fallback"
