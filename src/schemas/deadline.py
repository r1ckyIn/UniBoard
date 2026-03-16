"""Pydantic schemas for deadline endpoints."""

from pydantic import BaseModel, ConfigDict


class DeadlineResponse(BaseModel):
    """Single unified deadline response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    course_code: str
    course_name: str
    title: str
    due_date: str  # ISO 8601
    source: str
    source_tags: list[str]  # ["Canvas", "Ed Lessons"]
    weight: float | None
    description: str | None
    urgency: str  # "urgent", "warning", "normal", "past_due"
    is_confirmed: bool


class DeadlineDetailResponse(DeadlineResponse):
    """Extended deadline detail with dedup metadata."""

    dedup_key: str
    source_id: str


class ConflictDay(BaseModel):
    """A day with multiple deadlines (conflict)."""

    date: str  # ISO date
    deadline_count: int
    deadlines: list[DeadlineResponse]
