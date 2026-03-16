"""Pydantic schemas for Ed Discussion intelligence endpoints."""

from pydantic import BaseModel, ConfigDict


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
