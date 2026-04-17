"""Env-gated RAG real-data harness (AIFEAT-02).

Skips cleanly when RAG_REAL_DATA_COURSE_ID is unset so CI does not hit
external embedding/LLM APIs. Mirrors the Phase 32.1 SYNC_REAL_DATA_* pattern
so live verification requires one explicit env var (kept out of version
control) plus a previously-embedded course row.

Run with:

    RAG_REAL_DATA_COURSE_ID=<uuid> RAG_REAL_DATA_BEARER=<supabase-jwt> \
        uv run pytest tests/integration/test_rag_real_data.py
"""

from __future__ import annotations

import json
import os
import uuid

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RAG_REAL_DATA_COURSE_ID") is None,
    reason="RAG_REAL_DATA_COURSE_ID env var not set; skipping real-data harness",
)


@pytest.mark.asyncio(loop_scope="session")
async def test_real_course_returns_at_least_one_cited_source(
    test_client: httpx.AsyncClient,
) -> None:
    """AIFEAT-02 / D-D Pitfall 2: real synced course returns >=1 cited source.

    Asserts the SSE stream emits a 'sources' event with non-empty list, each
    source carrying an identifier (module_id or source_type) + relevance
    score (per phase 34 §5 schema).
    """
    course_id = uuid.UUID(os.environ["RAG_REAL_DATA_COURSE_ID"])
    bearer = os.environ.get("RAG_REAL_DATA_BEARER", "")

    sources_event_payload: list[dict[str, object]] | None = None
    async with test_client.stream(
        "POST",
        f"/api/v1/courses/{course_id}/qa/stream",
        json={"question": "What are the key topics covered in this course?"},
        headers={"Authorization": f"Bearer {bearer}"},
    ) as resp:
        assert resp.status_code == 200

        current_event: str | None = None
        async for raw_line in resp.aiter_lines():
            line = raw_line.strip()
            if line.startswith("event:"):
                current_event = line.split(":", 1)[1].strip()
                continue
            if line.startswith("data:") and current_event == "sources":
                payload = json.loads(line[5:].strip())
                sources_event_payload = payload.get("sources")
                break

    assert (
        sources_event_payload is not None
    ), "No 'sources' SSE event in real-data RAG response"
    assert (
        len(sources_event_payload) >= 1
    ), "Real RAG must return at least 1 cited source"

    first = sources_event_payload[0]
    # Per phase 34 §5 + Plan 34-04 sources_payload schema
    assert (
        "source_id" in first or "source_type" in first
    ), "Source missing identifier field"
    # `score` is the relevance metric (0-1 cosine) per Plan 34-04
    assert "score" in first and isinstance(first["score"], (int, float))
    assert 0.0 <= float(first["score"]) <= 1.0
