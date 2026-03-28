"""Pydantic schemas for AI engine endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class ThreadEvaluation(BaseModel):
    """Result of AI thread evaluation for GPA relevance."""

    model_config = ConfigDict(from_attributes=True)

    gpa_relevance: float = Field(ge=0.0, le=1.0)
    # exam_info | assignment_clarification | rubric | deadline_change |
    # common_mistake | endorsed_answer | irrelevant
    category: str
    summary: str
    urgency: str  # critical | important | informational
    key_facts: list[str]


class QARequest(BaseModel):
    """Request body for course Q&A."""

    model_config = ConfigDict(from_attributes=True)

    question: str = Field(min_length=3, max_length=1000)


class QAResponse(BaseModel):
    """Response from course Q&A with citations."""

    model_config = ConfigDict(from_attributes=True)

    answer: str
    citations: list[str]
    method: str  # "direct_context" or "rag"
    tokens_used: int


class UnitReviewResponse(BaseModel):
    """AI-generated unit review summary."""

    model_config = ConfigDict(from_attributes=True)

    course_id: str = ""
    course_name: str = ""
    key_concepts: list[str]
    common_mistakes: list[str]
    exam_scope: str
    study_tips: list[str]
    generated_at: str = ""


class StreamingQARequest(BaseModel):
    """Request body for streaming course Q&A."""

    model_config = ConfigDict(from_attributes=True)

    question: str = Field(min_length=3, max_length=1000)
    history: list[dict[str, str]] = Field(default_factory=list)
    search_more: bool = False  # User-triggered MCP fallback via "搜索更多"
    language: str = "en"  # "en" or "zh"


class ChatMessage(BaseModel):
    """Single chat message for multi-turn history."""

    model_config = ConfigDict(from_attributes=True)

    role: str  # "user" or "assistant"
    content: str
