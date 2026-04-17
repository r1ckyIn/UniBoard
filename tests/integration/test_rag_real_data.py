"""Env-gated RAG real-data harness (AIFEAT-02).

Skips cleanly when RAG_REAL_DATA_COURSE_ID is unset so CI does not hit
external embedding/LLM APIs. Mirrors the Phase 32.1 SYNC_REAL_DATA_* pattern
so live verification requires one explicit env var (kept out of version
control) plus a previously-embedded course row.
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RAG_REAL_DATA_COURSE_ID") is None,
    reason="RAG_REAL_DATA_COURSE_ID env var not set; skipping real-data harness",
)


@pytest.mark.xfail(strict=False, reason="Phase 34: implementation pending (34-04)")
def test_real_course_returns_at_least_one_cited_source() -> None:
    """AIFEAT-02: embed real synced course; ask known question; assert >=1 source cited."""
    pytest.xfail("Phase 34: implementation pending")
