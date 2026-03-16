"""Unit tests for EdIntelligenceService post filtering logic."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.discussion import DiscussionThread
from src.models.user import User
from src.security.password import hash_password
from src.services.intelligence import EdIntelligenceService


@pytest_asyncio.fixture(loop_scope="session")
async def _seed_intelligence_data(session: AsyncSession) -> dict[str, object]:
    """Seed a user, course, and discussion threads for intelligence tests."""
    user = User(
        email=f"intel-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass123"),
        display_name="Intel Test",
    )
    session.add(user)
    await session.flush()

    course = Course(
        user_id=user.id,
        name="Algorithms",
        code="COMP2017",
        semester="2026S1",
    )
    session.add(course)
    await session.flush()

    # Endorsed thread
    endorsed = DiscussionThread(
        course_id=course.id,
        ed_thread_id="100",
        title="Important Notice",
        author="staff@uni.edu",
        category="General",
        content="This is an endorsed post with important information about the exam.",
        is_endorsed=True,
        is_staff_post=False,
    )
    # Staff thread
    staff = DiscussionThread(
        course_id=course.id,
        ed_thread_id="101",
        title="Office Hours Update",
        author="prof@uni.edu",
        category="Admin",
        content="Office hours changed to Fridays.",
        is_endorsed=False,
        is_staff_post=True,
    )
    # Regular thread (should be excluded)
    regular = DiscussionThread(
        course_id=course.id,
        ed_thread_id="102",
        title="Can someone help with Q3?",
        author="student@uni.edu",
        category="Question",
        content="I'm stuck on question 3 of the assignment.",
        is_endorsed=False,
        is_staff_post=False,
    )
    # Both endorsed and staff
    both = DiscussionThread(
        course_id=course.id,
        ed_thread_id="103",
        title="Grade Curve Announcement",
        author="prof@uni.edu",
        category="Admin",
        content="A" * 250,  # Long content for truncation test
        is_endorsed=True,
        is_staff_post=True,
    )

    session.add_all([endorsed, staff, regular, both])
    await session.flush()

    return {
        "user_id": user.id,
        "course_id": course.id,
        "endorsed_id": endorsed.id,
        "staff_id": staff.id,
        "regular_id": regular.id,
        "both_id": both.id,
    }


@pytest.mark.asyncio(loop_scope="session")
async def test_endorsed_post_included(
    session: AsyncSession,
    _seed_intelligence_data: dict[str, object],
) -> None:
    """Endorsed posts should be included in results."""
    data = _seed_intelligence_data
    svc = EdIntelligenceService(session)
    posts = await svc.get_high_value_posts(
        data["user_id"],  # type: ignore[arg-type]
        data["course_id"],  # type: ignore[arg-type]
    )
    ids = {p.id for p in posts}
    assert str(data["endorsed_id"]) in ids


@pytest.mark.asyncio(loop_scope="session")
async def test_staff_post_included(
    session: AsyncSession,
    _seed_intelligence_data: dict[str, object],
) -> None:
    """Staff posts should be included in results."""
    data = _seed_intelligence_data
    svc = EdIntelligenceService(session)
    posts = await svc.get_high_value_posts(
        data["user_id"],  # type: ignore[arg-type]
        data["course_id"],  # type: ignore[arg-type]
    )
    ids = {p.id for p in posts}
    assert str(data["staff_id"]) in ids


@pytest.mark.asyncio(loop_scope="session")
async def test_regular_post_excluded(
    session: AsyncSession,
    _seed_intelligence_data: dict[str, object],
) -> None:
    """Regular posts (not endorsed, not staff) should be excluded."""
    data = _seed_intelligence_data
    svc = EdIntelligenceService(session)
    posts = await svc.get_high_value_posts(
        data["user_id"],  # type: ignore[arg-type]
        data["course_id"],  # type: ignore[arg-type]
    )
    ids = {p.id for p in posts}
    assert str(data["regular_id"]) not in ids


@pytest.mark.asyncio(loop_scope="session")
async def test_content_summary_truncated(
    session: AsyncSession,
    _seed_intelligence_data: dict[str, object],
) -> None:
    """Content longer than 200 chars should be truncated."""
    data = _seed_intelligence_data
    svc = EdIntelligenceService(session)
    posts = await svc.get_high_value_posts(
        data["user_id"],  # type: ignore[arg-type]
        data["course_id"],  # type: ignore[arg-type]
    )
    both_post = next(p for p in posts if p.id == str(data["both_id"]))
    assert len(both_post.content_summary) == 200
