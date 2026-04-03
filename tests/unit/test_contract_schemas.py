"""Unit tests for contract-aligned Pydantic schemas matching types.gen.d.ts."""


from src.schemas.deadline import ContractDeadlineResponse, DeadlineResponse
from src.schemas.intelligence import DiscussionResponse, HighValuePostResponse
from src.schemas.materials import (
    ContractSearchResultResponse,
    MaterialItemResponse,
    MaterialResponse,
    SearchResponse,
)


class TestContractDeadlineResponse:
    """ContractDeadlineResponse must match types.gen.d.ts Deadline schema."""

    def test_all_required_fields_present(self) -> None:
        d = ContractDeadlineResponse(
            id="1",
            title="Assignment 1",
            due_date="2026-03-20T00:00:00Z",
            source="canvas",
            status="upcoming",
            days_remaining=5,
            course_code="COMP2017",
            course_name="Systems Programming",
            is_confirmed=True,
        )
        assert d.id == "1"
        assert d.status == "upcoming"
        assert d.days_remaining == 5
        assert d.course_code == "COMP2017"
        assert d.course_name == "Systems Programming"
        assert d.is_confirmed is True

    def test_weight_optional_defaults_none(self) -> None:
        d = ContractDeadlineResponse(
            id="1",
            title="t",
            due_date="2026-01-01",
            source="canvas",
            status="upcoming",
            days_remaining=5,
            course_code="COMP2017",
            course_name="Systems",
            is_confirmed=True,
        )
        assert d.weight is None

    def test_weight_accepts_float(self) -> None:
        d = ContractDeadlineResponse(
            id="1",
            title="t",
            due_date="2026-01-01",
            source="canvas",
            weight=0.25,
            status="upcoming",
            days_remaining=5,
            course_code="COMP2017",
            course_name="Systems",
            is_confirmed=True,
        )
        assert d.weight == 0.25

    def test_legacy_schema_preserved(self) -> None:
        """Existing DeadlineResponse should still work."""
        d = DeadlineResponse(
            id="1",
            course_id="c1",
            course_code="COMP2017",
            course_name="Systems",
            title="t",
            due_date="2026-01-01",
            source="canvas",
            source_tags=["Canvas"],
            weight=None,
            description=None,
            urgency="normal",
            is_confirmed=True,
        )
        assert d.urgency == "normal"


class TestMaterialResponse:
    """MaterialResponse must match types.gen.d.ts Material schema."""

    def test_minimal_fields(self) -> None:
        m = MaterialResponse(
            id="1",
            title="Week 1 Module",
            source="canvas",
            source_type="module",
        )
        assert m.source == "canvas"
        assert m.source_type == "module"
        assert m.items is None
        assert m.slide_count is None
        assert m.url is None

    def test_with_items(self) -> None:
        item = MaterialItemResponse(
            title="Lecture Notes",
            type="File",
            url="https://canvas.example.com/file/1",
        )
        m = MaterialResponse(
            id="1",
            title="Week 1",
            source="ed",
            source_type="lesson",
            items=[item],
            slide_count=15,
        )
        assert len(m.items) == 1
        assert m.items[0].title == "Lecture Notes"
        assert m.slide_count == 15


class TestMaterialItemResponse:
    """MaterialItemResponse must match types.gen.d.ts MaterialItem schema."""

    def test_all_fields_required(self) -> None:
        item = MaterialItemResponse(
            title="Lecture 1",
            type="File",
            url="https://example.com",
        )
        assert item.title == "Lecture 1"
        assert item.type == "File"
        assert item.url == "https://example.com"


class TestDiscussionResponse:
    """DiscussionResponse must match types.gen.d.ts Discussion schema."""

    def test_all_fields_present(self) -> None:
        d = DiscussionResponse(
            id="1",
            ed_thread_id="e100",
            title="Important Notice",
            author="prof@uni.edu",
            category="General",
            is_endorsed=True,
            is_staff_post=False,
            gpa_relevance_score=0.8,
            relevance_category="exam",
            summary="Exam format details announced",
            created_at="2026-03-20T00:00:00Z",
        )
        assert d.author == "prof@uni.edu"
        assert d.gpa_relevance_score == 0.8
        assert d.relevance_category == "exam"
        assert d.summary == "Exam format details announced"

    def test_legacy_schema_preserved(self) -> None:
        """HighValuePostResponse should still work."""
        p = HighValuePostResponse(
            id="1",
            ed_thread_id="e1",
            title="t",
            category="c",
            content_summary="s",
            is_endorsed=True,
            is_staff_post=False,
            created_at="2026-01-01T00:00:00Z",
        )
        assert p.content_summary == "s"


class TestContractSearchResultResponse:
    """ContractSearchResultResponse must match types.gen.d.ts SearchResult schema."""

    def test_all_fields_present(self) -> None:
        s = ContractSearchResultResponse(
            type="material",
            title="Lecture 1",
            source="canvas",
            course_code="COMP2017",
            snippet="found in <b>lecture</b>",
            url="https://canvas.example.com/file/1",
            relevance=0.95,
        )
        assert s.type == "material"
        assert s.relevance == 0.95
        assert s.url == "https://canvas.example.com/file/1"

    def test_discussion_type(self) -> None:
        s = ContractSearchResultResponse(
            type="discussion",
            title="Exam Q3",
            source="ed",
            course_code="INFO1110",
            snippet="The exam question...",
            url="",
            relevance=0.6,
        )
        assert s.type == "discussion"

    def test_legacy_search_preserved(self) -> None:
        """SearchResponse should still work."""
        sr = SearchResponse(
            query="test",
            total_hits=0,
            results=[],
        )
        assert sr.total_hits == 0
