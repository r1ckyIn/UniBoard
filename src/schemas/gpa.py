"""Pydantic schemas for GPA/WAM endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class AssessmentDetail(BaseModel):
    """Single assessment within a course."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    score: float | None  # None = not yet graded
    max_score: float
    weight: float  # 0-1
    group_name: str


class CourseSummary(BaseModel):
    """Per-course GPA summary."""

    model_config = ConfigDict(from_attributes=True)

    course_id: str
    course_name: str
    course_code: str
    semester: str
    credit_points: int
    wam: float  # course WAM (0-100)
    grade_band: str  # HD, D, CR, P, F
    gpa_point: int  # 7, 6, 5, 4, 0
    pct_assessed: float  # 0-100 percentage of weights with grades
    assessment_count: int
    graded_count: int


class GPASummaryResponse(BaseModel):
    """Cumulative GPA/WAM summary."""

    cumulative_wam: float
    cumulative_gpa: float  # weighted GPA across courses
    total_credit_points: int
    course_count: int
    courses: list[CourseSummary]


class CourseDetailResponse(BaseModel):
    """Single course with assessment breakdown."""

    course_id: str
    course_name: str
    course_code: str
    semester: str
    credit_points: int
    wam: float
    grade_band: str
    gpa_point: int
    pct_assessed: float
    assessments: list[AssessmentDetail]
    weight_source: str  # "unit_outline" | "canvas_assignment_groups" | "unknown"


class WhatIfScore(BaseModel):
    """A single hypothetical score for what-if simulation."""

    assessment_id: str
    hypothetical_score: float = Field(ge=0, le=100)


class WhatIfCreateRequest(BaseModel):
    """Request to create a what-if scenario."""

    name: str = Field(min_length=1, max_length=255)
    scores: list[WhatIfScore]


class WhatIfScenarioResponse(BaseModel):
    """Saved what-if scenario result."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    result_wam: float
    result_gpa: float
    scores: list[WhatIfScore]
    created_at: str


class TargetRequest(BaseModel):
    """Request to calculate target path."""

    target_wam: float = Field(ge=0, le=100)
    mode: str = Field(default="uniform", pattern="^(uniform|smart)$")


class AssessmentTarget(BaseModel):
    """Minimum score needed for one assessment."""

    assessment_id: str
    assessment_name: str
    course_code: str
    minimum_score: float
    max_score: float
    weight: float
    credit_points: int


class TargetPathResponse(BaseModel):
    """Result of target path calculation."""

    target_wam: float
    is_achievable: bool
    max_achievable_wam: float
    required_scores: list[AssessmentTarget]


class SemesterTrend(BaseModel):
    """WAM/GPA data for one semester."""

    semester: str
    semester_wam: float
    semester_gpa: float
    cumulative_wam: float
    cumulative_gpa: float
    credit_points: int


class TrendResponse(BaseModel):
    """Per-semester WAM/GPA trend data."""

    semesters: list[SemesterTrend]
