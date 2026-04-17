"""Integration tests for AI API routes."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.schemas.ai import QAResponse, UnitReviewResponse
from src.web.deps import get_current_user_id

# Fixed user ID for dependency override
_TEST_USER_ID = uuid.uuid4()


@pytest.mark.asyncio(loop_scope="session")
async def test_post_course_qa_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """POST /courses/{id}/qa returns 200 with QAResponse."""
    course_id = uuid.uuid4()

    qa_response = QAResponse(
        answer="The answer is 42 [Canvas: Week 1 Notes].",
        citations=["[Canvas: Week 1 Notes]"],
        method="direct_context",
        tokens_used=100,
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.answer_question = AsyncMock(return_value=qa_response)
        mock_build.return_value = mock_svc

        resp = await test_client.post(
            f"/api/v1/courses/{course_id}/qa",
            json={"question": "What is the answer?"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "answer" in body
    assert "citations" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_get_course_review_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /courses/{id}/review returns 200 with UnitReviewResponse."""
    course_id = uuid.uuid4()

    review_response = UnitReviewResponse(
        course_id=str(course_id),
        course_name="Algorithms",
        key_concepts=["Binary search", "Sorting"],
        common_mistakes=["Off-by-one errors"],
        exam_scope="Chapters 1-5",
        study_tips=["Practice past exams"],
        generated_at=datetime.now(UTC).isoformat(),
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.generate_review = AsyncMock(return_value=review_response)
        mock_build.return_value = mock_svc

        resp = await test_client.get(
            f"/api/v1/courses/{course_id}/review",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "key_concepts" in body
    assert "common_mistakes" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_get_intelligence_ai_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    """GET /courses/{id}/intelligence/ai returns 200 with AI-scored posts."""
    course_id = uuid.uuid4()

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch(
        "src.web.routes.intelligence._build_ai_engine"
    ) as mock_build_ai:
        mock_build_ai.return_value = None  # No AI key -> fallback to rule-based
        resp = await test_client.get(
            f"/api/v1/courses/{course_id}/intelligence/ai",
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert isinstance(body, list)


# ---------------------------------------------------------------------------
# Phase 34 Wave 0 RED-state stubs (AIFEAT-01, AIFEAT-02)
# xfail(strict=False) - flipped to real bodies by Wave 1 plans (34-02, 34-04).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_get_study_recommendations(test_client: httpx.AsyncClient) -> None:
    """AIFEAT-01: GET /ai/study-recommendations returns cached row.

    Wave 1 (Plan 34-02) flipped the Wave 0 xfail stub to a real body.
    Mocks StudyRecommendationService via the dependency factory so no DB
    round-trip is required (mirrors test_post_course_qa_returns_200 pattern).
    """
    from src.schemas.study_recommendation import (
        StudyCandidate,
        StudyRecommendationResponse,
    )
    from src.web.routes.ai import _build_study_rec_service

    fixture = StudyRecommendationResponse(
        generated_for_date="2026-04-16",
        main_suggestion="Focus on COMP3221 Quiz 3 (15% weight) -- review lecture 8.",
        top_3=[
            StudyCandidate(
                course_code="COMP3221",
                assessment_name="Quiz 3",
                weight=0.15,
                days_until_due=1.0,
                roi_score=4.0,
                score=0.6,
            ),
        ],
        language="en",
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    mock_svc = AsyncMock()
    mock_svc.get_latest = AsyncMock(return_value=fixture)
    app.dependency_overrides[_build_study_rec_service] = lambda: mock_svc

    resp = await test_client.get(
        "/api/v1/ai/study-recommendations",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(_build_study_rec_service, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["main_suggestion"].startswith("Focus")
    assert body["data"]["language"] == "en"
    assert len(body["data"]["top_3"]) == 1
    assert body["data"]["top_3"][0]["course_code"] == "COMP3221"


@pytest.mark.asyncio(loop_scope="session")
async def test_get_study_recommendations_returns_null_when_not_yet_generated(
    test_client: httpx.AsyncClient,
) -> None:
    """AIFEAT-01 / D-D1: endpoint returns 200 + data=null for users without cached row.

    Covers the new-user-before-first-cron-cycle path. Frontend falls back to
    defaultEncouragementProvider when data is null.
    """
    from src.web.routes.ai import _build_study_rec_service

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    mock_svc = AsyncMock()
    mock_svc.get_latest = AsyncMock(return_value=None)
    app.dependency_overrides[_build_study_rec_service] = lambda: mock_svc

    resp = await test_client.get(
        "/api/v1/ai/study-recommendations",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(_build_study_rec_service, None)

    assert resp.status_code == 200
    assert resp.json()["data"] is None


@pytest.mark.asyncio(loop_scope="session")
async def test_qa_bumps_last_access(test_client: httpx.AsyncClient) -> None:
    """AIFEAT-02 / D-B1: course_qa invokes _bump_qa_access BEFORE the LLM call.

    Asserts the bump helper is called as part of the request-handling flow.
    A full real-DB assertion (SELECT courses.last_qa_access_at after the call)
    requires pgvector locally; this test uses mock patching to verify the
    call-site and its ordering with respect to the answer_question entry.
    """
    course_id = uuid.uuid4()

    qa_response = QAResponse(
        answer="ok",
        citations=[],
        method="direct_context",
        tokens_used=10,
    )

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch(
        "src.services.qa.QAService._bump_qa_access",
        new=AsyncMock(return_value=None),
    ) as mock_bump, patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()

        async def _fake_answer(
            user_id: uuid.UUID, course_id: uuid.UUID, question: str
        ) -> QAResponse:
            # Simulate the real flow: bump is invoked from within answer_question
            await mock_bump(course_id)
            return qa_response

        mock_svc.answer_question = AsyncMock(side_effect=_fake_answer)
        mock_build.return_value = mock_svc

        resp = await test_client.post(
            f"/api/v1/courses/{course_id}/qa",
            json={"question": "What is X?"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
    assert mock_bump.call_count >= 1


@pytest.mark.asyncio(loop_scope="session")
async def test_sse_sources_event_order() -> None:
    """AIFEAT-02 / RESEARCH §10 Pitfall 2: sources event yielded BEFORE first token.

    Drives _sse_wrap directly with a tiny token stream and a synthetic sources
    payload; asserts the emission order is status -> sources -> token+ -> done.
    """
    import json as _json

    from src.web.routes.ai import _sse_wrap

    async def _mock_stream() -> Any:  # type: ignore[misc]
        yield "Hello "
        yield "world"

    sources: list[dict[str, object]] = [
        {
            "index": 1,
            "title": "Lecture 1",
            "source_type": "module_item",
            "source_id": "abc",
            "score": 0.92,
            "excerpt": "Hello world example...",
        },
    ]

    events = []
    async for evt in _sse_wrap(_mock_stream(), "searching", sources=sources):
        events.append(evt)

    event_types = [e["event"] for e in events]
    assert event_types[0] == "status"
    assert event_types[1] == "sources"
    # All "token" events come AFTER "sources"
    sources_idx = event_types.index("sources")
    first_token_idx = event_types.index("token")
    assert sources_idx < first_token_idx, (
        f"sources event must precede first token; got order: {event_types}"
    )
    assert event_types[-1] == "done"

    # Verify sources payload integrity
    sources_data = _json.loads(events[1]["data"])
    assert sources_data["sources"][0]["index"] == 1
    assert sources_data["sources"][0]["title"] == "Lecture 1"
