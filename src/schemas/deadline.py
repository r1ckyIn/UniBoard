"""Pydantic schemas for deadline endpoints."""

from pydantic import BaseModel, ConfigDict

# --- Contract-aligned schemas (types.gen.d.ts) ---


class ContractDeadlineResponse(BaseModel):
    """Full deadline matching types.gen.d.ts Deadline schema.

    Includes course_code, course_name, is_confirmed (extends CourseDeadline).
    """

    id: str
    title: str
    due_date: str  # ISO 8601 datetime
    source: str
    weight: float | None = None
    status: str  # "upcoming" | "submitted" | "overdue" | "completed"
    days_remaining: int
    course_code: str
    course_name: str
    is_confirmed: bool
    is_pinned: bool = False
    is_deleted: bool = False


# --- User action schemas ---


class DeadlineActionCreate(BaseModel):
    """Request body for creating a deadline user action."""

    action: str  # "pin" | "delete"


class DeadlineActionResponse(BaseModel):
    """Response for a deadline user action."""

    id: str
    deadline_id: str
    action_type: str
    created_at: str  # ISO 8601


# --- Legacy schemas (used by existing service layer and tests) ---


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
