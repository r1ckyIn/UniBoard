"""Pydantic schemas for GPA/WAM endpoints."""

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Legacy schemas (used by existing unit tests -- remove in Phase 22)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Contract-aligned schemas (match types.gen.d.ts)
# ---------------------------------------------------------------------------


class GpaCourseSummaryResponse(BaseModel):
    """Per-course summary matching frontend GpaCourseSummary type."""

    course_id: str
    code: str
    name: str
    credit_points: int
    level_weight: int  # derived from course code: COMP2017 -> 2
    current_mark: float | None
    grade_letter: str | None
    completed_weight: float  # 0-1 scale


class GpaReportResponse(BaseModel):
    """Cumulative GPA report matching frontend GpaReport type."""

    scale: str = "wam"
    current_wam: float
    current_gpa_4: float
    target_wam: float | None = None
    gap: float | None = None
    courses: list[GpaCourseSummaryResponse]
    last_sync_at: str  # ISO 8601


class WhatIfScoreRequest(BaseModel):
    """A single what-if score matching frontend WhatIfScore type."""

    course_id: str
    assessment_name: str
    assumed_score: float = Field(ge=0, le=100)


class PredictRequest(BaseModel):
    """Request body for POST /gpa/predict."""

    what_if_scores: list[WhatIfScoreRequest]
    scale: str = "wam"


class GpaPredictionCourseResponse(BaseModel):
    """Per-course prediction detail matching frontend GpaPredictionCourse."""

    course_id: str
    code: str
    current_mark: float
    predicted_mark: float
    applied_assumptions: list[WhatIfScoreRequest]


class GpaPredictionResponse(BaseModel):
    """Prediction result matching frontend GpaPrediction type."""

    current_wam: float
    predicted_wam: float
    delta: float
    per_course: list[GpaPredictionCourseResponse]


class GpaPathAssessmentResponse(BaseModel):
    """Single remaining assessment in a path course."""

    name: str
    weight: float
    minimum_score: float


class GpaPathCourseResponse(BaseModel):
    """Per-course path detail matching frontend GpaPathCourse."""

    course_id: str
    code: str
    current_mark: float
    minimum_remaining_avg: float
    remaining_assessments: list[GpaPathAssessmentResponse]
    difficulty: str  # "easy" | "moderate" | "hard" | "impossible"


class GpaPathResponse(BaseModel):
    """Path calculation result matching frontend GpaPath type."""

    target_wam: float
    current_wam: float
    is_achievable: bool
    per_course: list[GpaPathCourseResponse]


class GpaPathRequest(BaseModel):
    """Request body for POST /gpa/path."""

    target_wam: float = Field(ge=0, le=100)


# ---------------------------------------------------------------------------
# Phase 34 -- multi-course path planner (AIFEAT-03)
# ---------------------------------------------------------------------------


class MultiCoursePathRequest(BaseModel):
    """Request body for POST /gpa/multi-course-path (per phase 34 D-C1)."""

    target_wam: float = Field(ge=0, le=100)
    remaining_credit_points: int = Field(ge=0)


class MultiCoursePathResponse(BaseModel):
    """Multi-course planner result: math + optional AI advisory.

    Per phase 34 D-C3: when target unreachable, returns suggested_target
    (highest USYD band still in max_reachable's reach).
    Per phase 34 D-D1: AI advisory_text=None on AI failure (math always
    returned).
    """

    target_wam: float
    current_wam: float
    is_achievable: bool
    required_avg: float | None  # None if cp_remain=0 OR target already met (=0)
    max_reachable: float
    suggested_target: float | None  # next-best USYD band when unreachable
    advisory_text: str | None  # 30-50 word AI line; None on AI failure (D-D1)
    language: str  # "en" | "zh"
