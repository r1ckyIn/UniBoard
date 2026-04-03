"""Pydantic schemas for Ed Discussion intelligence endpoints."""

from pydantic import BaseModel, ConfigDict

# --- Contract-aligned schema (types.gen.d.ts) ---


class DiscussionResponse(BaseModel):
    """Discussion thread matching types.gen.d.ts Discussion schema."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    ed_thread_id: str
    title: str
    author: str
    category: str
    is_endorsed: bool
    is_staff_post: bool
    gpa_relevance_score: float
    relevance_category: str
    summary: str
    created_at: str


# --- Legacy schemas (used by existing service layer and tests) ---


class HighValuePostResponse(BaseModel):
    """High-value Ed Discussion post (endorsed or staff-answered)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    ed_thread_id: str
    title: str
    category: str
    content_summary: str  # First 200 chars
    is_endorsed: bool
    is_staff_post: bool
    created_at: str


class AIHighValuePostResponse(BaseModel):
    """AI-scored high-value Ed Discussion post with relevance metrics."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    ed_thread_id: str
    title: str
    category: str
    content_summary: str
    is_endorsed: bool
    is_staff_post: bool
    created_at: str
    gpa_relevance: float
    ai_category: str
    ai_summary: str
    urgency: str
    key_facts: list[str]
