"""Pydantic schemas for notification endpoints."""

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """Single notification item."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    severity: str
    title: str
    body: str
    is_read: bool
    action_url: str | None
    created_at: str
    metadata_json: dict[str, object] | None = None


class UnreadCountResponse(BaseModel):
    """Unread notification count."""

    count: int


class MarkReadRequest(BaseModel):
    """Empty body -- action is in URL."""
