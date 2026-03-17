"""Pydantic schemas for digest and risk alert endpoints."""

from pydantic import BaseModel, ConfigDict


class DigestItemResponse(BaseModel):
    """Single item within a daily digest."""

    type: str  # grade, deadline, post
    title: str
    detail: str
    course_code: str
    urgency_score: int | None = None  # 1-5, None if AI not applied
    timestamp: str


class DigestResponse(BaseModel):
    """Full daily digest with optional AI summary."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    digest_date: str
    items: list[DigestItemResponse]
    ai_summary: str | None = None
    created_at: str


class RiskAlertResponse(BaseModel):
    """GPA risk alert with AI-generated recommendation."""

    id: str
    course_code: str
    course_name: str
    current_wam: float
    target_wam: float
    gap: float
    severity: str
    recommendation: str
    created_at: str
