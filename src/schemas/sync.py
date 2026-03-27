"""Pydantic schemas for sync engine endpoints."""

from pydantic import BaseModel


class SyncSourceStatus(BaseModel):
    """Status of a single sync source (Canvas or Ed)."""

    platform: str  # "canvas" | "ed"
    status: str  # "success" | "failed" | "syncing" | "degraded" | "pending"
    last_synced_at: str | None
    token_status: str  # "active" | "expired" | "not_configured"


class SyncStatusResponse(BaseModel):
    """Aggregated sync status for all sources."""

    sources: list[SyncSourceStatus]
    is_syncing: bool


class SyncTriggerResponse(BaseModel):
    """Response after triggering a manual sync."""

    message: str
    next_allowed_at: str  # ISO 8601 timestamp


class SyncHistoryEntry(BaseModel):
    """Single sync history audit record."""

    id: str
    domain: str
    status: str
    records_updated: int
    error_message: str | None
    started_at: str
    completed_at: str | None


class SyncHistoryResponse(BaseModel):
    """Paginated sync history for a user."""

    entries: list[SyncHistoryEntry]
