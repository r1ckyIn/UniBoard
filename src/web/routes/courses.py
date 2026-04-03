"""Course REST endpoints matching OpenAPI contract."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.grade import Grade
from src.models.unit_outline import UnitOutline
from src.schemas.common import NotFoundError, SuccessResponse
from src.schemas.course import (
    AssessmentWeightResponse,
    CourseDeadlineResponse,
    CourseDetailResponse,
    CourseOutlineResponse,
    CourseResponse,
    GradeResponse,
    OutlineAssessmentResponse,
)
from src.web.deps import get_current_user_id, get_request_meta, get_session

router = APIRouter()


def _grade_letter(mark: float) -> str:
    """Derive USYD grade letter from a percentage mark."""
    if mark >= 85:
        return "HD"
    if mark >= 75:
        return "D"
    if mark >= 65:
        return "CR"
    if mark >= 50:
        return "P"
    return "F"


async def _get_course_or_404(
    session: AsyncSession,
    course_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Course:
    """Load a course by ID and user, raising NotFoundError if missing."""
    stmt = select(Course).where(Course.id == course_id, Course.user_id == user_id)
    result = await session.execute(stmt)
    course = result.scalar_one_or_none()
    if course is None:
        raise NotFoundError("Course")
    return course


@router.get("")
async def list_courses(
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
) -> SuccessResponse[list[CourseResponse]]:
    """List all courses for the current user with computed fields."""
    stmt = (
        select(Course)
        .where(Course.user_id == current_user_id)
        .options(
            selectinload(Course.grades),
            selectinload(Course.unit_outlines),
        )
    )
    result = await session.execute(stmt)
    courses = result.scalars().all()

    items: list[CourseResponse] = []
    for c in courses:
        # Compute current_mark from graded assessments
        graded = [g for g in c.grades if g.score is not None]
        current_mark: float | None = None
        grade_letter: str | None = None
        completed_weight: float | None = None

        if graded:
            total_graded_weight = sum(g.weight for g in graded)
            if total_graded_weight > 0:
                weighted_sum = sum(
                    (g.score / g.max_score) * g.weight * 100
                    for g in graded
                    if g.max_score > 0 and g.score is not None
                )
                current_mark = round(weighted_sum / total_graded_weight, 2)
                grade_letter = _grade_letter(current_mark)

            total_weight = sum(g.weight for g in c.grades)
            if total_weight > 0:
                completed_weight = round(total_graded_weight / total_weight, 4)

        has_unit_outline = bool(c.unit_outlines)
        last_sync = c.updated_at.isoformat() if c.updated_at else None

        items.append(
            CourseResponse(
                id=str(c.id),
                name=c.name,
                code=c.code,
                semester=c.semester,
                credit_points=c.credit_points,
                canvas_course_id=c.canvas_course_id,
                ed_course_id=c.ed_course_id,
                current_mark=current_mark,
                grade_letter=grade_letter,
                completed_weight=completed_weight,
                has_unit_outline=has_unit_outline,
                last_sync_at=last_sync,
            )
        )

    return SuccessResponse(data=items, meta=get_request_meta(request))


@router.get("/{course_id}")
async def get_course_detail(
    course_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
) -> SuccessResponse[CourseDetailResponse]:
    """Return course detail with assessment weights."""
    stmt = (
        select(Course)
        .where(Course.id == course_id, Course.user_id == current_user_id)
        .options(
            selectinload(Course.grades),
            selectinload(Course.unit_outlines),
        )
    )
    result = await session.execute(stmt)
    course = result.scalar_one_or_none()
    if course is None:
        raise NotFoundError("Course")

    # Compute course-level fields
    graded = [g for g in course.grades if g.score is not None]
    current_mark: float | None = None
    grade_letter: str | None = None
    completed_weight: float | None = None

    total_graded_weight = sum(g.weight for g in graded) if graded else 0.0
    total_weight = sum(g.weight for g in course.grades)

    if graded and total_graded_weight > 0:
        weighted_sum = sum(
            (g.score / g.max_score) * g.weight * 100
            for g in graded
            if g.max_score > 0 and g.score is not None
        )
        current_mark = round(weighted_sum / total_graded_weight, 2)
        grade_letter = _grade_letter(current_mark)

    if total_weight > 0:
        completed_weight = round(total_graded_weight / total_weight, 4)

    # Build assessment_weights from grades
    assessment_weights: list[AssessmentWeightResponse] = []
    for g in course.grades:
        status = "graded" if g.score is not None else "upcoming"
        if g.submitted_at and g.score is None:
            status = "submitted"
        assessment_weights.append(
            AssessmentWeightResponse(
                name=g.assessment_name,
                weight=g.weight,
                score=g.score,
                max_score=g.max_score,
                status=status,
                group_name=g.group_name,
                due_date=None,
            )
        )

    # Determine weight source
    weight_source = "canvas_assignment_groups"
    if course.unit_outlines and any(uo.assessments for uo in course.unit_outlines):
        weight_source = "unit_outline"

    has_unit_outline = bool(course.unit_outlines)
    last_sync = course.updated_at.isoformat() if course.updated_at else None

    data = CourseDetailResponse(
        id=str(course.id),
        name=course.name,
        code=course.code,
        semester=course.semester,
        credit_points=course.credit_points,
        canvas_course_id=course.canvas_course_id,
        ed_course_id=course.ed_course_id,
        current_mark=current_mark,
        grade_letter=grade_letter,
        completed_weight=completed_weight,
        has_unit_outline=has_unit_outline,
        last_sync_at=last_sync,
        assessment_weights=assessment_weights,
        weight_source=weight_source,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))


@router.get("/{course_id}/grades")
async def list_grades(
    course_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
) -> SuccessResponse[list[GradeResponse]]:
    """List grades for a course."""
    await _get_course_or_404(session, course_id, current_user_id)

    stmt = (
        select(Grade)
        .where(Grade.course_id == course_id)
        .order_by(Grade.graded_at.desc().nullslast())
    )
    result = await session.execute(stmt)
    grades = result.scalars().all()

    items: list[GradeResponse] = []
    for g in grades:
        if g.score is None:
            continue
        items.append(
            GradeResponse(
                id=str(g.id),
                assessment_name=g.assessment_name,
                score=g.score,
                max_score=g.max_score,
                weight=g.weight,
                group_name=g.group_name,
                graded_at=g.graded_at.isoformat() if g.graded_at else "",
                submitted_at=g.submitted_at.isoformat() if g.submitted_at else "",
            )
        )

    return SuccessResponse(data=items, meta=get_request_meta(request))


@router.get("/{course_id}/deadlines")
async def list_course_deadlines(
    course_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
) -> SuccessResponse[list[CourseDeadlineResponse]]:
    """List deadlines for a course."""
    await _get_course_or_404(session, course_id, current_user_id)

    stmt = (
        select(UnifiedDeadline)
        .where(UnifiedDeadline.course_id == course_id)
        .order_by(UnifiedDeadline.due_date.asc())
    )
    result = await session.execute(stmt)
    deadlines = result.scalars().all()

    # Use naive datetime to match TIMESTAMP WITHOUT TIME ZONE column
    now = datetime.utcnow()  # noqa: DTZ003

    # Pre-load grades for this course to check completed status
    grade_stmt = select(Grade).where(Grade.course_id == course_id)
    grade_result = await session.execute(grade_stmt)
    course_grades = grade_result.scalars().all()
    graded_names = {g.assessment_name for g in course_grades if g.score is not None}

    items: list[CourseDeadlineResponse] = []
    for dl in deadlines:
        days_remaining = (dl.due_date - now).days
        is_past = dl.due_date < now

        # Determine status
        if is_past and dl.title in graded_names:
            status = "completed"
        elif is_past:
            status = "overdue"
        else:
            status = "upcoming"

        items.append(
            CourseDeadlineResponse(
                id=str(dl.id),
                title=dl.title,
                due_date=dl.due_date.isoformat(),
                source=dl.source,
                weight=dl.weight,
                status=status,
                days_remaining=days_remaining,
            )
        )

    return SuccessResponse(data=items, meta=get_request_meta(request))


@router.get("/{course_id}/outline")
async def get_course_outline(
    course_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
) -> SuccessResponse[CourseOutlineResponse]:
    """Return course outline from unit outline data."""
    await _get_course_or_404(session, course_id, current_user_id)

    stmt = (
        select(UnitOutline)
        .where(UnitOutline.course_id == course_id)
        .order_by(UnitOutline.fetched_at.desc().nullslast())
        .limit(1)
    )
    result = await session.execute(stmt)
    outline = result.scalar_one_or_none()

    if outline is None:
        raise NotFoundError("CourseOutline")

    # Parse assessments from JSON
    assessments: list[OutlineAssessmentResponse] = []
    if outline.assessments:
        for a in outline.assessments:
            assessments.append(
                OutlineAssessmentResponse(
                    name=a.get("name", ""),
                    weight=float(a.get("weight", 0)),
                    description=a.get("description", ""),
                    due_date=a.get("due_date"),
                    length=a.get("length"),
                    ai_policy=a.get("ai_policy"),
                )
            )

    learning_outcomes: list[str] = outline.learning_outcomes or []

    source = "unit_outline" if outline.outline_url else "canvas_fallback"

    data = CourseOutlineResponse(
        course_id=str(course_id),
        outline_url=outline.outline_url,
        assessments=assessments,
        learning_outcomes=learning_outcomes,
        fetched_at=outline.fetched_at.isoformat() if outline.fetched_at else "",
        source=source,
    )
    return SuccessResponse(data=data, meta=get_request_meta(request))
