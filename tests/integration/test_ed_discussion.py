"""Integration tests for EdDiscussionAdapter against real Ed API.

All tests skip if ED_API_TOKEN is not set in the environment.
NO mocks -- pure integration testing per CONTEXT.md locked decision.
"""

import os

import pytest

from src.adapters.ed_discussion import EdDiscussionAdapter

ED_TOKEN = os.environ.get("ED_API_TOKEN")
ED_COURSE_ID = "31567"  # COMP2017 from TRD SS11.1

pytestmark = pytest.mark.skipif(not ED_TOKEN, reason="ED_API_TOKEN not set")


@pytest.fixture
async def ed() -> EdDiscussionAdapter:
    """Create an EdDiscussionAdapter with the real token."""
    assert ED_TOKEN is not None
    adapter = EdDiscussionAdapter(api_token=ED_TOKEN)
    yield adapter  # type: ignore[misc]
    await adapter.close()


async def test_get_threads(ed: EdDiscussionAdapter) -> None:
    """Verify get_threads returns a list of parsed thread dicts."""
    threads = await ed.get_threads(ED_COURSE_ID)
    assert isinstance(threads, list)
    assert len(threads) >= 1
    for thread in threads:
        assert "id" in thread
        assert "title" in thread


async def test_get_threads_with_filter(ed: EdDiscussionAdapter) -> None:
    """Verify get_threads respects sort and limit parameters."""
    threads = await ed.get_threads(ED_COURSE_ID, sort="top", limit=10)
    assert isinstance(threads, list)
    assert len(threads) <= 10


async def test_search_threads(ed: EdDiscussionAdapter) -> None:
    """Verify search_threads returns a list (may be empty but should not error)."""
    results = await ed.search_threads(ED_COURSE_ID, "assignment")
    assert isinstance(results, list)


async def test_pydantic_extra_fields_ignored(ed: EdDiscussionAdapter) -> None:
    """Verify parsing succeeds even when Ed API returns unknown fields."""
    threads = await ed.get_threads(ED_COURSE_ID, limit=1)
    assert isinstance(threads, list)
    # If threads exist, they were successfully parsed with extra='ignore'
    if threads:
        assert "id" in threads[0]
        assert "title" in threads[0]


async def test_validate_token(ed: EdDiscussionAdapter) -> None:
    """Verify validate_token returns True for a valid token."""
    result = await ed.validate_token()
    assert result is True


async def test_validate_token_invalid() -> None:
    """Verify validate_token returns False for an invalid token."""
    adapter = EdDiscussionAdapter(api_token="bad-token")
    try:
        result = await adapter.validate_token()
        assert result is False
    finally:
        await adapter.close()
