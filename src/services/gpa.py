"""GPA/WAM calculation service with what-if simulation and target path planning."""

from __future__ import annotations

import uuid
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.course import Course
from src.models.grade import Grade
from src.models.whatif import WhatIfScenario
from src.schemas.common import NotFoundError
from src.schemas.gpa import (
    AssessmentDetail,
    AssessmentTarget,
    CourseDetailResponse,
    CourseSummary,
    GPASummaryResponse,
    SemesterTrend,
    TargetPathResponse,
    TargetRequest,
    TrendResponse,
    WhatIfCreateRequest,
    WhatIfScenarioResponse,
    WhatIfScore,
)

# USYD grade band thresholds: (min_mark, band_name, gpa_point)
GRADE_BANDS: list[tuple[Decimal, str, int]] = [
    (Decimal("85"), "HD", 7),
    (Decimal("75"), "D", 6),
    (Decimal("65"), "CR", 5),
    (Decimal("50"), "P", 4),
    (Decimal("0"), "F", 0),
]

_TWO_PLACES = Decimal("0.01")


class GPAService:
    """Business logic for GPA/WAM calculation, what-if, and target path."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Pure calculation helpers (all use Decimal)
    # ------------------------------------------------------------------

    @staticmethod
    def _mark_to_grade_band(mark: Decimal) -> tuple[str, int]:
        """Map a percentage mark to USYD grade band and GPA point."""
        for threshold, band, point in GRADE_BANDS:
            if mark >= threshold:
                return band, point
        return "F", 0

    @staticmethod
    def _calculate_course_wam(
        grades: list[Grade],
    ) -> tuple[Decimal, Decimal]:
        """Calculate per-course WAM and percentage assessed.

        Returns (course_wam, pct_assessed).
        course_wam = sum(score/max_score * weight * 100) / sum(graded_weights)
        pct_assessed = sum(graded_weights) / sum(all_weights) * 100
        """
        graded = [g for g in grades if g.score is not None]
        all_weight: Decimal = sum(
            (Decimal(str(g.weight)) for g in grades), Decimal("0")
        )

        if not graded or all_weight == 0:
            return Decimal("0"), Decimal("0")

        graded_weight: Decimal = sum(
            (Decimal(str(g.weight)) for g in graded), Decimal("0")
        )

        # Weighted percentage for each graded assessment
        weighted_sum = Decimal("0")
        for g in graded:
            score = Decimal(str(g.score))
            max_score = Decimal(str(g.max_score))
            weight = Decimal(str(g.weight))
            if max_score > 0:
                weighted_sum += (score / max_score) * weight * Decimal("100")

        course_wam = (
            (weighted_sum / graded_weight).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
            if graded_weight > 0
            else Decimal("0")
        )
        if all_weight > 0:
            pct_assessed = (graded_weight / all_weight * Decimal("100")).quantize(
                _TWO_PLACES, rounding=ROUND_HALF_UP
            )
        else:
            pct_assessed = Decimal("0")
        return course_wam, pct_assessed

    @staticmethod
    def _calculate_cumulative_wam(
        courses_data: list[tuple[Decimal, int]],
    ) -> Decimal:
        """Calculate cumulative WAM = sum(mark * cp) / sum(cp).

        Input: list of (course_wam, credit_points).
        """
        if not courses_data:
            return Decimal("0.00")
        total_weighted: Decimal = sum(
            (wam * Decimal(str(cp)) for wam, cp in courses_data), Decimal("0")
        )
        total_credits: Decimal = sum(
            (Decimal(str(cp)) for _, cp in courses_data), Decimal("0")
        )
        if total_credits == 0:
            return Decimal("0.00")
        return (total_weighted / total_credits).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)

    @staticmethod
    def _calculate_cumulative_gpa(
        courses_data: list[tuple[Decimal, int]],
    ) -> Decimal:
        """Calculate cumulative GPA = sum(gpa_point * cp) / sum(cp).

        Maps each course_wam to its GPA point, then computes weighted average.
        """
        if not courses_data:
            return Decimal("0.00")
        total_weighted = Decimal("0")
        total_credits = Decimal("0")
        for wam, cp in courses_data:
            _, gpa_point = GPAService._mark_to_grade_band(wam)
            d_cp = Decimal(str(cp))
            total_weighted += Decimal(str(gpa_point)) * d_cp
            total_credits += d_cp
        if total_credits == 0:
            return Decimal("0.00")
        return (total_weighted / total_credits).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)

    # ------------------------------------------------------------------
    # Service methods
    # ------------------------------------------------------------------

    async def _load_user_courses(self, user_id: uuid.UUID) -> list[Course]:
        """Load all courses for a user with their grades eagerly loaded."""
        stmt = (
            select(Course)
            .where(Course.user_id == user_id)
            .options(selectinload(Course.grades))
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_summary(self, user_id: uuid.UUID) -> GPASummaryResponse:
        """Calculate cumulative WAM/GPA from all courses with grades."""
        courses = await self._load_user_courses(user_id)

        course_summaries: list[CourseSummary] = []
        graded_courses_data: list[tuple[Decimal, int]] = []

        for course in courses:
            course_wam, pct_assessed = self._calculate_course_wam(course.grades)
            band, gpa_point = self._mark_to_grade_band(course_wam)
            graded_count = sum(1 for g in course.grades if g.score is not None)

            summary = CourseSummary(
                course_id=str(course.id),
                course_name=course.name,
                course_code=course.code,
                semester=course.semester,
                credit_points=course.credit_points,
                wam=float(course_wam),
                grade_band=band,
                gpa_point=gpa_point,
                pct_assessed=float(pct_assessed),
                assessment_count=len(course.grades),
                graded_count=graded_count,
            )
            course_summaries.append(summary)

            if graded_count > 0:
                graded_courses_data.append((course_wam, course.credit_points))

        cumulative_wam = self._calculate_cumulative_wam(graded_courses_data)
        cumulative_gpa = self._calculate_cumulative_gpa(graded_courses_data)
        total_cp = sum(c.credit_points for c in courses)

        return GPASummaryResponse(
            cumulative_wam=float(cumulative_wam),
            cumulative_gpa=float(cumulative_gpa),
            total_credit_points=total_cp,
            course_count=len(courses),
            courses=course_summaries,
        )

    async def get_course_detail(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> CourseDetailResponse:
        """Return single course detail with assessment breakdown."""
        stmt = (
            select(Course)
            .where(Course.id == course_id, Course.user_id == user_id)
            .options(
                selectinload(Course.grades),
                selectinload(Course.unit_outlines),
            )
        )
        result = await self._session.execute(stmt)
        course = result.scalar_one_or_none()
        if course is None:
            raise NotFoundError("Course")

        course_wam, pct_assessed = self._calculate_course_wam(course.grades)
        band, gpa_point = self._mark_to_grade_band(course_wam)

        assessments = [
            AssessmentDetail(
                id=str(g.id),
                name=g.assessment_name,
                score=g.score,
                max_score=g.max_score,
                weight=g.weight,
                group_name=g.group_name,
            )
            for g in course.grades
        ]

        # Determine weight source
        weight_source = "unknown"
        if course.unit_outlines and any(
            uo.assessments for uo in course.unit_outlines
        ):
            weight_source = "unit_outline"
        elif course.grading_weights:
            weight_source = "canvas_assignment_groups"

        return CourseDetailResponse(
            course_id=str(course.id),
            course_name=course.name,
            course_code=course.code,
            semester=course.semester,
            credit_points=course.credit_points,
            wam=float(course_wam),
            grade_band=band,
            gpa_point=gpa_point,
            pct_assessed=float(pct_assessed),
            assessments=assessments,
            weight_source=weight_source,
        )

    async def simulate(
        self,
        user_id: uuid.UUID,
        request: WhatIfCreateRequest,
    ) -> WhatIfScenarioResponse:
        """Create a what-if scenario with hypothetical scores."""
        courses = await self._load_user_courses(user_id)

        # Build assessment ID -> hypothetical score mapping
        overrides: dict[str, float] = {
            s.assessment_id: s.hypothetical_score for s in request.scores
        }

        # Calculate WAM with overrides applied
        graded_courses_data: list[tuple[Decimal, int]] = []
        for course in courses:
            graded_weight = Decimal("0")
            weighted_sum = Decimal("0")
            for g in course.grades:
                gid = str(g.id)
                # Use override score if provided, otherwise use actual score
                score_raw = overrides.get(gid, g.score)
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
                graded_courses_data.append((course_wam, course.credit_points))

        result_wam = self._calculate_cumulative_wam(graded_courses_data)
        result_gpa = self._calculate_cumulative_gpa(graded_courses_data)

        scenario = WhatIfScenario(
            user_id=user_id,
            name=request.name,
            scores_json=overrides,
            result_wam=float(result_wam),
            result_gpa=float(result_gpa),
        )
        self._session.add(scenario)
        await self._session.flush()

        return WhatIfScenarioResponse(
            id=str(scenario.id),
            name=scenario.name,
            result_wam=scenario.result_wam,
            result_gpa=scenario.result_gpa,
            scores=request.scores,
            created_at=scenario.created_at.isoformat(),
        )

    async def list_scenarios(
        self,
        user_id: uuid.UUID,
    ) -> list[WhatIfScenarioResponse]:
        """List all what-if scenarios for a user."""
        stmt = (
            select(WhatIfScenario)
            .where(WhatIfScenario.user_id == user_id)
            .order_by(WhatIfScenario.created_at.desc())
        )
        result = await self._session.execute(stmt)
        scenarios = result.scalars().all()

        return [
            WhatIfScenarioResponse(
                id=str(s.id),
                name=s.name,
                result_wam=s.result_wam,
                result_gpa=s.result_gpa,
                scores=[
                    WhatIfScore(assessment_id=k, hypothetical_score=v)
                    for k, v in (s.scores_json or {}).items()
                ],
                created_at=s.created_at.isoformat(),
            )
            for s in scenarios
        ]

    async def calculate_target_path(
        self,
        user_id: uuid.UUID,
        request: TargetRequest,
    ) -> TargetPathResponse:
        """Calculate minimum scores needed per assessment to reach target WAM."""
        courses = await self._load_user_courses(user_id)
        target = Decimal(str(request.target_wam))

        # Collect current weighted contributions and ungraded assessments
        current_weighted = Decimal("0")
        current_weight_total = Decimal("0")
        total_weight_all = Decimal("0")
        ungraded: list[tuple[Grade, Course]] = []

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
                    ungraded.append((g, course))

        remaining_weight = total_weight_all - current_weight_total

        # Calculate max achievable WAM (assume 100 for all ungraded)
        if total_weight_all > 0:
            max_wam = (
                (current_weighted + Decimal("100") * remaining_weight) / total_weight_all
            ).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
        else:
            max_wam = Decimal("0.00")

        # Check if target is achievable
        is_achievable = target <= max_wam

        required_scores: list[AssessmentTarget] = []

        if not ungraded or remaining_weight == 0:
            return TargetPathResponse(
                target_wam=float(target),
                is_achievable=is_achievable,
                max_achievable_wam=float(max_wam),
                required_scores=[],
            )

        if request.mode == "uniform":
            # All ungraded assessments get the same score X
            # target = (current_weighted + X * remaining_weight) / total_weight_all
            # X = (target * total_weight_all - current_weighted) / remaining_weight
            needed = (target * total_weight_all - current_weighted) / remaining_weight
            needed = needed.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)

            for g, course in ungraded:
                # Clamp to [0, 100]
                clamped = min(max(needed, Decimal("0")), Decimal("100"))
                required_scores.append(
                    AssessmentTarget(
                        assessment_id=str(g.id),
                        assessment_name=g.assessment_name,
                        course_code=course.code,
                        minimum_score=float(clamped),
                        max_score=g.max_score,
                        weight=g.weight,
                        credit_points=course.credit_points,
                    )
                )
        else:
            # Smart mode: sort by credit_points DESC so high-cp courses
            # get proportionally lower requirements (distribute load)
            sorted_ungraded = sorted(
                ungraded,
                key=lambda x: x[1].credit_points,
                reverse=True,
            )
            total_needed = target * total_weight_all - current_weighted
            # Smart: score inversely proportional to credit_points
            # High-cp courses need lower scores since each point counts more
            sum_raw_weights = sum(
                (Decimal(str(g.weight)) for g, _ in sorted_ungraded),
                Decimal("0"),
            )
            if sum_raw_weights == 0:
                sum_raw_weights = Decimal("1")

            for g, course in sorted_ungraded:
                cp = Decimal(str(course.credit_points))
                score_needed = total_needed / (sum_raw_weights * cp)
                score_needed = score_needed.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
                clamped = min(max(score_needed, Decimal("0")), Decimal("100"))
                required_scores.append(
                    AssessmentTarget(
                        assessment_id=str(g.id),
                        assessment_name=g.assessment_name,
                        course_code=course.code,
                        minimum_score=float(clamped),
                        max_score=g.max_score,
                        weight=g.weight,
                        credit_points=course.credit_points,
                    )
                )

        return TargetPathResponse(
            target_wam=float(target),
            is_achievable=is_achievable,
            max_achievable_wam=float(max_wam),
            required_scores=required_scores,
        )

    async def get_trend(self, user_id: uuid.UUID) -> TrendResponse:
        """Return per-semester WAM/GPA trend data."""
        courses = await self._load_user_courses(user_id)

        # Group courses by semester
        semester_courses: dict[str, list[Course]] = {}
        for course in courses:
            semester_courses.setdefault(course.semester, []).append(course)

        # Sort semesters chronologically
        sorted_semesters = sorted(semester_courses.keys())

        trends: list[SemesterTrend] = []
        # Running totals for O(n) cumulative calculation
        cum_weighted = Decimal("0")
        cum_gpa_weighted = Decimal("0")
        cum_credits = Decimal("0")

        for semester in sorted_semesters:
            sem_courses = semester_courses[semester]
            sem_data: list[tuple[Decimal, int]] = []
            sem_cp = 0

            for course in sem_courses:
                graded = [g for g in course.grades if g.score is not None]
                if graded:
                    course_wam, _ = self._calculate_course_wam(course.grades)
                    d_cp = Decimal(str(course.credit_points))
                    sem_data.append((course_wam, course.credit_points))
                    # Update running cumulative totals
                    cum_weighted += course_wam * d_cp
                    _, gpa_point = self._mark_to_grade_band(course_wam)
                    cum_gpa_weighted += Decimal(str(gpa_point)) * d_cp
                    cum_credits += d_cp
                sem_cp += course.credit_points

            sem_wam = self._calculate_cumulative_wam(sem_data)
            sem_gpa = self._calculate_cumulative_gpa(sem_data)
            cum_wam = (
                (cum_weighted / cum_credits).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
                if cum_credits > 0
                else Decimal("0.00")
            )
            cum_gpa = (
                (cum_gpa_weighted / cum_credits).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
                if cum_credits > 0
                else Decimal("0.00")
            )

            trends.append(
                SemesterTrend(
                    semester=semester,
                    semester_wam=float(sem_wam),
                    semester_gpa=float(sem_gpa),
                    cumulative_wam=float(cum_wam),
                    cumulative_gpa=float(cum_gpa),
                    credit_points=sem_cp,
                )
            )

        return TrendResponse(semesters=trends)
