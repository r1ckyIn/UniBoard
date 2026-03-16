"""Deadline aggregation service with SHA-256 dedup and fuzzy matching."""

from __future__ import annotations

import hashlib
import re
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.schemas.common import NotFoundError
from src.schemas.deadline import ConflictDay, DeadlineDetailResponse, DeadlineResponse

# Fuzzy matching threshold (0-100 scale, rapidfuzz token_set_ratio)
# Set at 95 to catch formatting variants ("Assignment 1 - Due Oct 15" vs "Assignment 1")
# but reject genuinely different items ("Assignment 1" vs "Assignment 2")
FUZZY_THRESHOLD = 95

# Regex patterns for extracting deadlines from Ed Discussion text
_DATE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"due\s+(?:by|on|date:?)\s+(.+?)(?:\.|,|$)", re.IGNORECASE),
    re.compile(r"deadline:?\s+(.+?)(?:\.|,|$)", re.IGNORECASE),
    re.compile(r"submit\s+by\s+(.+?)(?:\.|,|$)", re.IGNORECASE),
    re.compile(r"(\d{4}-\d{2}-\d{2})"),
    re.compile(r"(\d{1,2}/\d{1,2}/\d{4})"),
]


def normalize_title(title: str) -> str:
    """Normalize title for dedup comparison: lowercase, strip punctuation, collapse spaces."""
    cleaned = re.sub(r"[^\w\s]", "", title.lower().strip())
    return re.sub(r"\s+", " ", cleaned).strip()


def compute_dedup_key(course_code: str, title: str, due_date: str) -> str:
    """Compute SHA-256 dedup key from course_code + normalized title + due_date."""
    normalized = normalize_title(title)
    payload = f"{course_code.upper()}|{normalized}|{due_date}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def find_near_duplicate(
    new_title: str,
    existing_deadlines: list[UnifiedDeadline],
) -> UnifiedDeadline | None:
    """Find a fuzzy match among existing deadlines using rapidfuzz.

    Only compares within same course + same due_date (caller must pre-filter).
    Returns the first match with ratio >= FUZZY_THRESHOLD, or None.
    """
    normalized_new = normalize_title(new_title)
    for deadline in existing_deadlines:
        normalized_existing = normalize_title(deadline.title)
        # token_set_ratio handles supersets well: "assignment 1 due oct 15" vs
        # "assignment 1" scores 100 because the intersection tokens match perfectly.
        # Threshold 95 rejects "assignment 1" vs "assignment 2" (91.7).
        score = fuzz.token_set_ratio(normalized_new, normalized_existing)
        if score >= FUZZY_THRESHOLD:
            return deadline
    return None


def calculate_urgency(due_date: datetime) -> str:
    """Calculate urgency level based on time remaining until due date."""
    now = datetime.now(UTC)
    due_aware = due_date.replace(tzinfo=UTC) if due_date.tzinfo is None else due_date
    delta = due_aware - now

    if delta < timedelta(0):
        return "past_due"
    if delta <= timedelta(hours=24):
        return "urgent"
    if delta <= timedelta(hours=72):
        return "warning"
    return "normal"


def extract_deadlines_from_text(text: str) -> list[str]:
    """Extract deadline date strings from Ed Discussion post text using regex."""
    matches: list[str] = []
    for pattern in _DATE_PATTERNS:
        for match in pattern.finditer(text):
            extracted = match.group(1).strip()
            if extracted and extracted not in matches:
                matches.append(extracted)
    return matches


def _deadline_to_response(
    deadline: UnifiedDeadline,
    course: Course,
) -> DeadlineResponse:
    """Convert UnifiedDeadline ORM object to DeadlineResponse schema."""
    urgency = calculate_urgency(deadline.due_date)
    # Build source tags from the source field
    source_tags = [deadline.source.replace("_", " ").title()]
    return DeadlineResponse(
        id=str(deadline.id),
        course_id=str(deadline.course_id),
        course_code=course.code,
        course_name=course.name,
        title=deadline.title,
        due_date=deadline.due_date.isoformat(),
        source=deadline.source,
        source_tags=source_tags,
        weight=deadline.weight,
        description=deadline.description,
        urgency=urgency,
        is_confirmed=deadline.is_confirmed,
    )


class DeadlineService:
    """Business logic for deadline aggregation and deduplication."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_deadlines(
        self,
        user_id: uuid.UUID,
        *,
        course_code: str | None = None,
        urgency: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        include_past: bool = False,
        sort: str = "due_date",
        order: str = "asc",
    ) -> list[DeadlineResponse]:
        """Get filtered, urgency-graded deadlines for a user."""
        stmt = (
            select(UnifiedDeadline, Course)
            .join(Course, UnifiedDeadline.course_id == Course.id)
            .where(Course.user_id == user_id)
        )

        if course_code:
            stmt = stmt.where(Course.code == course_code)
        if from_date:
            stmt = stmt.where(UnifiedDeadline.due_date >= from_date)
        if to_date:
            stmt = stmt.where(UnifiedDeadline.due_date <= to_date)
        if not include_past:
            stmt = stmt.where(UnifiedDeadline.due_date >= datetime.utcnow())  # noqa: DTZ003

        # Sort
        sort_col = UnifiedDeadline.due_date
        stmt = stmt.order_by(sort_col.desc()) if order == "desc" else stmt.order_by(sort_col.asc())

        result = await self._session.execute(stmt)
        rows = result.all()

        responses = [_deadline_to_response(dl, course) for dl, course in rows]

        # Apply urgency filter post-query (urgency is computed, not stored)
        if urgency:
            responses = [r for r in responses if r.urgency == urgency]

        return responses

    async def get_deadline(
        self,
        user_id: uuid.UUID,
        deadline_id: uuid.UUID,
    ) -> DeadlineDetailResponse:
        """Get single deadline detail with dedup metadata."""
        stmt = (
            select(UnifiedDeadline, Course)
            .join(Course, UnifiedDeadline.course_id == Course.id)
            .where(Course.user_id == user_id)
            .where(UnifiedDeadline.id == deadline_id)
        )
        result = await self._session.execute(stmt)
        row = result.one_or_none()
        if row is None:
            raise NotFoundError("Deadline")

        deadline, course = row
        base = _deadline_to_response(deadline, course)
        return DeadlineDetailResponse(
            **base.model_dump(),
            dedup_key=deadline.dedup_key,
            source_id=deadline.source_id,
        )

    async def get_conflicts(
        self,
        user_id: uuid.UUID,
    ) -> list[ConflictDay]:
        """Get days with 2+ deadlines (conflicts)."""
        deadlines = await self.get_deadlines(user_id, include_past=False)

        by_date: dict[str, list[DeadlineResponse]] = defaultdict(list)
        for dl in deadlines:
            date_str = dl.due_date[:10]  # ISO date portion
            by_date[date_str].append(dl)

        conflicts = [
            ConflictDay(date=date, deadline_count=len(dls), deadlines=dls)
            for date, dls in sorted(by_date.items())
            if len(dls) >= 2
        ]
        return conflicts

    async def aggregate_and_dedup(
        self,
        course: Course,
        canvas_assignments: list[dict[str, object]],
        ed_lessons_data: list[dict[str, object]],
        ed_discussion_texts: list[tuple[str, str]],
    ) -> int:
        """Aggregate deadlines from all sources and deduplicate.

        Returns the count of new deadlines inserted.
        """
        # Collect all existing deadlines for this course
        stmt = select(UnifiedDeadline).where(
            UnifiedDeadline.course_id == course.id
        )
        result = await self._session.execute(stmt)
        existing = list(result.scalars().all())
        existing_keys = {d.dedup_key for d in existing}

        new_count = 0

        # Phase 1: Process Canvas assignments
        for assignment in canvas_assignments:
            title = str(assignment.get("name", ""))
            due_str = str(assignment.get("due_at", ""))
            if not title or not due_str:
                continue

            due_date_str = due_str[:10]
            key = compute_dedup_key(course.code, title, due_date_str)

            if key in existing_keys:
                continue  # Exact match

            # Fuzzy match against same-date deadlines
            same_date = [
                d for d in existing if d.due_date.isoformat()[:10] == due_date_str
            ]
            fuzzy_match = find_near_duplicate(title, same_date)
            if fuzzy_match is not None:
                continue  # Fuzzy match found

            # Insert new deadline
            try:
                due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
            except ValueError:
                continue

            values = {
                "id": uuid.uuid4(),
                "course_id": course.id,
                "title": title,
                "due_date": due_dt,
                "source": "canvas_assignment",
                "source_id": str(assignment.get("id", "")),
                "weight": float(str(assignment["weight"])) if assignment.get("weight") else None,
                "description": str(assignment.get("description", "")) or None,
                "dedup_key": key,
                "is_confirmed": True,
            }

            insert_stmt = pg_insert(UnifiedDeadline).values(**values)
            insert_stmt = insert_stmt.on_conflict_do_update(
                index_elements=["dedup_key"],
                set_={"title": values["title"], "due_date": values["due_date"]},
            )
            await self._session.execute(insert_stmt)
            existing_keys.add(key)
            new_count += 1

        # Phase 2: Process Ed Lessons deadlines
        for lesson_data in ed_lessons_data:
            title = str(lesson_data.get("title", ""))
            due_str = str(lesson_data.get("due_at", ""))
            if not title or not due_str:
                continue

            due_date_str = due_str[:10]
            key = compute_dedup_key(course.code, title, due_date_str)

            if key in existing_keys:
                continue

            same_date = [
                d for d in existing if d.due_date.isoformat()[:10] == due_date_str
            ]
            fuzzy_match = find_near_duplicate(title, same_date)
            if fuzzy_match is not None:
                continue

            try:
                due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
            except ValueError:
                continue

            values = {
                "id": uuid.uuid4(),
                "course_id": course.id,
                "title": title,
                "due_date": due_dt,
                "source": "ed_lesson",
                "source_id": str(lesson_data.get("id", "")),
                "weight": None,
                "description": None,
                "dedup_key": key,
                "is_confirmed": True,
            }

            insert_stmt = pg_insert(UnifiedDeadline).values(**values)
            insert_stmt = insert_stmt.on_conflict_do_update(
                index_elements=["dedup_key"],
                set_={"title": values["title"], "due_date": values["due_date"]},
            )
            await self._session.execute(insert_stmt)
            existing_keys.add(key)
            new_count += 1

        # Phase 3: Process Ed Discussion regex-extracted deadlines
        for text_content, source_id in ed_discussion_texts:
            extracted_dates = extract_deadlines_from_text(text_content)
            for date_str in extracted_dates:
                key = compute_dedup_key(course.code, f"discussion_{source_id}", date_str)
                if key in existing_keys:
                    continue

                values = {
                    "id": uuid.uuid4(),
                    "course_id": course.id,
                    "title": f"Deadline mentioned in discussion {source_id}",
                    "due_date": datetime.now(UTC),  # Placeholder; parse would be needed
                    "source": "ed_discussion",
                    "source_id": source_id,
                    "weight": None,
                    "description": text_content[:200],
                    "dedup_key": key,
                    "is_confirmed": False,
                }

                insert_stmt = pg_insert(UnifiedDeadline).values(**values)
                insert_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=["dedup_key"],
                    set_={"description": values["description"]},
                )
                await self._session.execute(insert_stmt)
                existing_keys.add(key)
                new_count += 1

        return new_count
