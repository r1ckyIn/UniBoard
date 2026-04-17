"""RED-state test scaffolding for AIFEAT-02 embedding worker.

Phase 34 Wave 0 pattern: xfail(strict=False) stubs allow pytest collection
to pass green. Wave 1 (Plan 34-04) flips strict=True and writes real bodies.
"""

from __future__ import annotations

import pytest


@pytest.mark.xfail(strict=False, reason="Phase 34: implementation pending (34-04)")
def test_rehash_triggers_reembed() -> None:
    """AIFEAT-02: should_reembed_course returns True when content_hash differs."""
    pytest.xfail("Phase 34: implementation pending")


@pytest.mark.xfail(strict=False, reason="Phase 34: implementation pending (34-04)")
def test_skips_unaccessed_courses() -> None:
    """AIFEAT-02: course with last_qa_access_at < 7d ago -> skip re-embed (cold-set filter)."""
    pytest.xfail("Phase 34: implementation pending")


@pytest.mark.xfail(strict=False, reason="Phase 34: implementation pending (34-04)")
def test_respects_rate_limits() -> None:
    """AIFEAT-02: worker yields between course iterations (no 429 burst on Voyage API)."""
    pytest.xfail("Phase 34: implementation pending")
