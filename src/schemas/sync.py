"""Pydantic schemas for sync engine endpoints."""

from pydantic import BaseModel


class SyncSourceStatus(BaseModel):
    """Status of a single sync source (Canvas or Ed)."""

    platform: str  # "canvas" | "ed"
    status: str  # "success" | "failed" | "syncing" | "degraded" | "pending"
    last_synced_at: str | None
    token_status: str  # "active" | "expired" | "not_configured"


# ── OpenAPI-contract-aligned response models ────────────────────────────────


class SyncCount(BaseModel):
    """Counters for a single sync domain."""

    synced: int
    new: int
    updated: int


class SyncResults(BaseModel):
    """Aggregated results across sync domains."""

    grades: SyncCount | None = None
    deadlines: SyncCount | None = None
    discussions: SyncCount | None = None


class SyncDetail(BaseModel):
    """Last sync session detail matching OpenAPI SyncDetail schema."""

    sync_id: str
    status: str  # "in_progress" | "completed" | "failed"
    started_at: str
    completed_at: str | None = None
    results: SyncResults


class PlatformHealth(BaseModel):
    """Health status of a single platform."""

    status: str  # "healthy" | "degraded" | "error"
    last_success: str


class PlatformStatus(BaseModel):
    """Health status of all platforms."""

    canvas: PlatformHealth
    ed: PlatformHealth


class SyncStatusResponse(BaseModel):
    """Aggregated sync status matching OpenAPI SyncStatusResponse schema."""

    last_sync: SyncDetail
    platforms: PlatformStatus


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
