"""GPA/WAM REST endpoints matching OpenAPI contract."""

import re
import uuid
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.course import Course
from src.models.user import Profile
from src.schemas.common import SuccessResponse
from src.schemas.gpa import (
    GpaCourseSummaryResponse,
    GpaPathAssessmentResponse,
    GpaPathCourseResponse,
    GpaPathRequest,
    GpaPathResponse,
    GpaPredictionCourseResponse,
    GpaPredictionResponse,
    GpaReportResponse,
    PredictRequest,
    TrendResponse,
    WhatIfScenarioResponse,
    WhatIfScoreRequest,
)
from src.services.gpa import GPAService
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()

_TWO_PLACES = Decimal("0.01")


def _parse_level_weight(course_code: str) -> int:
    """Extract course level from code. E.g., COMP2017 -> 2, MATH1005 -> 1."""
    match = re.search(r"[A-Z]{4}(\d)", course_code)
    return int(match.group(1)) if match else 1


def get_gpa_service(session: AsyncSession = Depends(get_session)) -> GPAService:
    """FastAPI dependency: create GPAService with current session."""
    return GPAService(session)


@router.get("")
async def get_gpa_report(
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GpaReportResponse]:
    """Return cumulative WAM/GPA report matching frontend GpaReport type."""
    # Get legacy summary from service
    legacy = await svc.get_summary(current_user_id)

    # Read user profile for target_wam
    profile_stmt = select(Profile).where(Profile.id == current_user_id)
    profile_result = await session.execute(profile_stmt)
    profile = profile_result.scalar_one_or_none()

    target_wam = profile.gpa_target if profile else None
    gap = (target_wam - legacy.cumulative_wam) if target_wam is not None else None

    # Compute last_sync_at from most recent course updated_at
    courses_stmt = (
        select(Course)
        .where(Course.user_id == current_user_id)
        .order_by(Course.updated_at.desc())
        .limit(1)
    )
    courses_result = await session.execute(courses_stmt)
    latest_course = courses_result.scalar_one_or_none()
    last_sync_at = (
        latest_course.updated_at.isoformat()
        if latest_course and latest_course.updated_at
        else datetime.now(UTC).isoformat()
    )

    # Adapt per-course summaries to contract shape
    course_responses: list[GpaCourseSummaryResponse] = []
    for cs in legacy.courses:
        course_responses.append(
            GpaCourseSummaryResponse(
                course_id=cs.course_id,
                code=cs.course_code,
                name=cs.course_name,
                credit_points=cs.credit_points,
                level_weight=_parse_level_weight(cs.course_code),
                current_mark=cs.wam if cs.wam > 0 else None,
                grade_letter=cs.grade_band if cs.grade_band != "F" or cs.wam > 0 else None,
                completed_weight=round(cs.pct_assessed / 100.0, 4),
            )
        )

    data = GpaReportResponse(
        scale="wam",
        current_wam=legacy.cumulative_wam,
        current_gpa_4=legacy.cumulative_gpa,
        target_wam=target_wam,
        gap=gap,
        courses=course_responses,
        last_sync_at=last_sync_at,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.post("/predict")
async def predict_gpa(
    body: PredictRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GpaPredictionResponse]:
    """Predict GPA with what-if scores matching frontend GpaPrediction type."""
    # Load courses with grades
    courses = await svc._load_user_courses(current_user_id)

    # Get current WAM from service
    legacy = await svc.get_summary(current_user_id)
    current_wam = legacy.cumulative_wam

    # Build course_id -> assumption mapping
    assumptions_by_course: dict[str, list[WhatIfScoreRequest]] = {}
    score_lookup: dict[tuple[str, str], float] = {}
    for wis in body.what_if_scores:
        assumptions_by_course.setdefault(wis.course_id, [])
        assumptions_by_course[wis.course_id].append(wis)
        score_lookup[(wis.course_id, wis.assessment_name)] = wis.assumed_score

    # Calculate predicted WAM with overrides applied
    predicted_courses_data: list[tuple[Decimal, int]] = []
    per_course: list[GpaPredictionCourseResponse] = []

    for course in courses:
        course_id_str = str(course.id)
        graded_weight = Decimal("0")
        weighted_sum = Decimal("0")

        for g in course.grades:
            # Check if there's an override for this assessment
            override = score_lookup.get((course_id_str, g.assessment_name))
            score_raw = override if override is not None else g.score
            if score_raw is None:
                continue
            score = Decimal(str(score_raw))
            max_score = Decimal(str(g.max_score))
            weight = Decimal(str(g.weight))
            if max_score > 0:
                weighted_sum += (score / max_score) * weight * Decimal("100")
                graded_weight += weight

        if graded_weight > 0:
            course_wam = (weighted_sum / graded_weight).quantize(
                _TWO_PLACES, rounding=ROUND_HALF_UP
            )
            predicted_courses_data.append((course_wam, course.credit_points))

            # Get original course WAM for current_mark
            original_wam, _ = svc._calculate_course_wam(course.grades)

            # Only add to per_course if this course had assumptions applied
            applied = [
                ws for ws in body.what_if_scores if ws.course_id == course_id_str
            ]

            per_course.append(
                GpaPredictionCourseResponse(
                    course_id=course_id_str,
                    code=course.code,
                    current_mark=float(original_wam),
                    predicted_mark=float(course_wam),
                    applied_assumptions=applied,
                )
            )

    predicted_wam = float(
        svc._calculate_cumulative_wam(predicted_courses_data)
    )

    data = GpaPredictionResponse(
        current_wam=current_wam,
        predicted_wam=predicted_wam,
        delta=round(predicted_wam - current_wam, 2),
        per_course=per_course,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.post("/path")
async def calculate_path(
    body: GpaPathRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GpaPathResponse]:
    """Calculate target path matching frontend GpaPath type."""
    courses = await svc._load_user_courses(current_user_id)
    target = Decimal(str(body.target_wam))

    # Get current WAM
    legacy = await svc.get_summary(current_user_id)
    current_wam = legacy.cumulative_wam

    # Group ungraded assessments by course
    course_ungraded: dict[str, list] = {}
    current_weighted = Decimal("0")
    current_weight_total = Decimal("0")
    total_weight_all = Decimal("0")

    for course in courses:
        cp = Decimal(str(course.credit_points))
        for g in course.grades:
            weight = Decimal(str(g.weight))
            weighted_cp = weight * cp
            total_weight_all += weighted_cp

            if g.score is not None:
                score = Decimal(str(g.score))
                max_score = Decimal(str(g.max_score))
                if max_score > 0:
                    pct = (score / max_score) * Decimal("100")
                    current_weighted += pct * weighted_cp
                    current_weight_total += weighted_cp
            else:
                course_id_str = str(course.id)
                course_ungraded.setdefault(course_id_str, [])
                course_ungraded[course_id_str].append((g, course))

    remaining_weight = total_weight_all - current_weight_total

    # Check achievability
    if total_weight_all > 0:
        max_wam = (
            (current_weighted + Decimal("100") * remaining_weight) / total_weight_all
        ).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
    else:
        max_wam = Decimal("0.00")

    is_achievable = target <= max_wam

    # Calculate uniform minimum scores per course
    per_course: list[GpaPathCourseResponse] = []
    if remaining_weight > 0:
        needed = (target * total_weight_all - current_weighted) / remaining_weight
        needed = needed.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
    else:
        needed = Decimal("0")

    for course in courses:
        course_id_str = str(course.id)
        ungraded_items = course_ungraded.get(course_id_str, [])
        if not ungraded_items:
            continue

        # Get course current mark
        original_wam, _ = svc._calculate_course_wam(course.grades)
        clamped = min(max(needed, Decimal("0")), Decimal("100"))

        remaining_assessments = [
            GpaPathAssessmentResponse(
                name=g.assessment_name,
                weight=g.weight,
                minimum_score=float(clamped),
            )
            for g, _ in ungraded_items
        ]

        # Determine difficulty from minimum_remaining_avg
        min_avg = float(clamped)
        if min_avg >= 90:
            difficulty = "impossible"
        elif min_avg >= 80:
            difficulty = "hard"
        elif min_avg >= 60:
            difficulty = "moderate"
        else:
            difficulty = "easy"

        per_course.append(
            GpaPathCourseResponse(
                course_id=course_id_str,
                code=course.code,
                current_mark=float(original_wam),
                minimum_remaining_avg=min_avg,
                remaining_assessments=remaining_assessments,
                difficulty=difficulty,
            )
        )

    data = GpaPathResponse(
        target_wam=float(target),
        current_wam=current_wam,
        is_achievable=is_achievable,
        per_course=per_course,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.get("/what-if")
async def list_whatif(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[list[WhatIfScenarioResponse]]:
    """List all saved what-if scenarios for the current user."""
    result = await svc.list_scenarios(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))


@router.get("/trend")
async def get_trend(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[TrendResponse]:
    """Return per-semester WAM/GPA trend data."""
    result = await svc.get_trend(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))
