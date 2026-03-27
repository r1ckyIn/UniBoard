"""Pydantic schemas for course materials and search endpoints."""

from pydantic import BaseModel, ConfigDict


# --- Contract-aligned schemas (types.gen.d.ts) ---


class MaterialItemResponse(BaseModel):
    """Single item within a material folder matching types.gen.d.ts MaterialItem."""

    title: str
    type: str
    url: str


class MaterialResponse(BaseModel):
    """Flat material entry matching types.gen.d.ts Material schema."""

    id: str
    title: str
    source: str  # "canvas" | "ed"
    source_type: str  # "module" | "lesson"
    items: list[MaterialItemResponse] | None = None
    slide_count: int | None = None
    url: str | None = None


class ContractSearchResultResponse(BaseModel):
    """Search result matching types.gen.d.ts SearchResult schema."""

    type: str  # "material" | "discussion"
    title: str
    source: str
    course_code: str
    snippet: str
    url: str
    relevance: float


# --- Legacy schemas (used by existing service layer and tests) ---


class FolderItem(BaseModel):
    """Individual item within a folder (module item or lesson)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    type: str  # "File", "Page", "Lesson", etc.
    url: str | None
    source: str  # "canvas" | "ed_lessons"


class FolderResponse(BaseModel):
    """Course material folder (Canvas module or Ed Lessons group)."""

    id: str
    name: str
    source: str  # "canvas" | "ed_lessons"
    position: int
    item_count: int
    ai_description: str | None
    items: list[FolderItem] | None = None  # Only populated in detail view


class CourseMaterialsResponse(BaseModel):
    """All materials for a course, grouped by folders."""

    course_id: str
    course_name: str
    folders: list[FolderResponse]


class SearchHit(BaseModel):
    """Single search result from tsvector full-text search."""

    id: str
    title: str
    course_id: str
    course_name: str
    course_code: str
    type: str  # "module_item" | "lesson"
    source: str
    snippet: str  # ts_headline result with <b>highlighted</b> terms
    rank: float


class SearchResponse(BaseModel):
    """Full-text search results with metadata."""

    query: str
    total_hits: int
    results: list[SearchHit]
