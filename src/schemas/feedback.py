"""Pydantic schemas for AI feedback endpoints."""

from pydantic import BaseModel, ConfigDict, field_validator


class FeedbackRequest(BaseModel):
    """Request body for submitting thread feedback."""

    feedback_type: str  # "thumbs_up" | "thumbs_down"

    @field_validator("feedback_type")
    @classmethod
    def validate_feedback_type(cls, v: str) -> str:
        """Ensure feedback_type is one of the allowed values."""
        if v not in ("thumbs_up", "thumbs_down"):
            msg = "feedback_type must be 'thumbs_up' or 'thumbs_down'"
            raise ValueError(msg)
        return v


class FeedbackResponse(BaseModel):
    """Response body after submitting thread feedback."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    thread_id: str
    feedback_type: str
    created_at: str
