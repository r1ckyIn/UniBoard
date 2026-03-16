"""Integration tests for all 11 ORM models against real PostgreSQL."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.discussion import DiscussionThread
from src.models.grade import Grade
from src.models.lesson import Lesson, Slide
from src.models.module import Module, ModuleItem
from src.models.push_record import PushRecord
from src.models.unit_outline import UnitOutline
from src.models.user import User


def _make_user(**overrides: object) -> User:
    """Create a User with sensible defaults."""
    defaults: dict[str, object] = {
        "email": f"test-{uuid.uuid4().hex[:8]}@test.com",
        "hashed_password": "hashed_pw_placeholder",
    }
    defaults.update(overrides)
    return User(**defaults)


def _make_course(user_id: uuid.UUID, **overrides: object) -> Course:
    """Create a Course linked to a user."""
    defaults: dict[str, object] = {
        "user_id": user_id,
        "name": "Test Course",
        "code": "TEST1001",
        "semester": "2026-S1",
    }
    defaults.update(overrides)
    return Course(**defaults)


async def test_create_user(session: AsyncSession) -> None:
    """Create a user and verify it can be read back."""
    user = _make_user(email="user1@example.com")
    session.add(user)
    await session.flush()

    result = await session.execute(select(User).where(User.email == "user1@example.com"))
    fetched = result.scalar_one()
    assert fetched.email == "user1@example.com"
    assert fetched.hashed_password == "hashed_pw_placeholder"
    assert fetched.id is not None


async def test_create_course_with_user(session: AsyncSession) -> None:
    """Create a course linked to a user and verify the relationship."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id, name="COMP2017 Systems Programming")
    session.add(course)
    await session.flush()

    result = await session.execute(select(Course).where(Course.user_id == user.id))
    fetched = result.scalar_one()
    assert fetched.name == "COMP2017 Systems Programming"
    assert fetched.user_id == user.id


async def test_create_grade(session: AsyncSession) -> None:
    """Create a grade and verify score and weight fields."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    grade = Grade(
        course_id=course.id,
        assessment_name="Assignment 1",
        score=85.0,
        max_score=100.0,
        weight=0.2,
        group_name="Assignments",
    )
    session.add(grade)
    await session.flush()

    result = await session.execute(select(Grade).where(Grade.course_id == course.id))
    fetched = result.scalar_one()
    assert fetched.assessment_name == "Assignment 1"
    assert fetched.score == 85.0
    assert fetched.weight == 0.2


async def test_create_discussion_thread(session: AsyncSession) -> None:
    """Create a discussion thread with is_endorsed and gpa_relevance_score."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    thread = DiscussionThread(
        course_id=course.id,
        ed_thread_id="12345",
        title="Exam scope question",
        author="student1",
        category="Questions",
        content="What topics are covered in the final exam?",
        is_endorsed=True,
        gpa_relevance_score=0.85,
    )
    session.add(thread)
    await session.flush()

    result = await session.execute(
        select(DiscussionThread).where(DiscussionThread.course_id == course.id)
    )
    fetched = result.scalar_one()
    assert fetched.is_endorsed is True
    assert fetched.gpa_relevance_score == 0.85
    assert fetched.title == "Exam scope question"


async def test_create_unified_deadline(session: AsyncSession) -> None:
    """Create a unified deadline with dedup_key and source."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    deadline = UnifiedDeadline(
        course_id=course.id,
        title="Assignment 1 Due",
        due_date=datetime(2026, 4, 15, 23, 59, ),
        source="canvas_assignment",
        source_id="asgn_001",
        dedup_key="a" * 64,
        is_confirmed=True,
    )
    session.add(deadline)
    await session.flush()

    result = await session.execute(
        select(UnifiedDeadline).where(UnifiedDeadline.course_id == course.id)
    )
    fetched = result.scalar_one()
    assert fetched.source == "canvas_assignment"
    assert fetched.dedup_key == "a" * 64


async def test_create_unit_outline(session: AsyncSession) -> None:
    """Create a unit outline with JSON assessments and raw_html."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    outline = UnitOutline(
        course_id=course.id,
        outline_url="https://www.sydney.edu.au/units/COMP2017",
        assessments=[
            {"name": "Assignment 1", "weight": 0.2},
            {"name": "Final Exam", "weight": 0.5},
        ],
        raw_html="<html><body>Unit outline content</body></html>",
        semester="2026-S1",
    )
    session.add(outline)
    await session.flush()

    result = await session.execute(
        select(UnitOutline).where(UnitOutline.course_id == course.id)
    )
    fetched = result.scalar_one()
    assert fetched.assessments is not None
    assert len(fetched.assessments) == 2
    assert fetched.raw_html is not None


async def test_create_module_with_items(session: AsyncSession) -> None:
    """Create a module with items and verify the relationship."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    module = Module(
        course_id=course.id,
        canvas_module_id="mod_001",
        name="Week 1 - Introduction",
        position=1,
    )
    session.add(module)
    await session.flush()

    item = ModuleItem(
        module_id=module.id,
        title="Lecture Slides",
        type="File",
        content_id="file_001",
    )
    session.add(item)
    await session.flush()

    result = await session.execute(
        select(ModuleItem).where(ModuleItem.module_id == module.id)
    )
    fetched = result.scalar_one()
    assert fetched.title == "Lecture Slides"
    assert fetched.type == "File"


async def test_create_lesson_with_slides(session: AsyncSession) -> None:
    """Create a lesson with slides and verify the content field."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    lesson = Lesson(
        course_id=course.id,
        ed_lesson_id="lesson_001",
        title="Week 1 Tutorial",
        number=1,
        kind="tutorial",
        slide_count=3,
    )
    session.add(lesson)
    await session.flush()

    slide = Slide(
        lesson_id=lesson.id,
        content="<document>Slide content here</document>",
        type="text",
        index=0,
    )
    session.add(slide)
    await session.flush()

    result = await session.execute(
        select(Slide).where(Slide.lesson_id == lesson.id)
    )
    fetched = result.scalar_one()
    assert fetched.content is not None
    assert "Slide content" in fetched.content


async def test_create_push_record(session: AsyncSession) -> None:
    """Create a push record with content_hash."""
    user = _make_user()
    session.add(user)
    await session.flush()

    record = PushRecord(
        user_id=user.id,
        content_hash="b" * 64,
        source_type="thread",
        source_id="thread_001",
        pushed_at=datetime.now(UTC).replace(tzinfo=None),
        channel="email",
    )
    session.add(record)
    await session.flush()

    result = await session.execute(
        select(PushRecord).where(PushRecord.user_id == user.id)
    )
    fetched = result.scalar_one()
    assert fetched.content_hash == "b" * 64
    assert fetched.channel == "email"


async def test_user_cascade_delete(session: AsyncSession) -> None:
    """Deleting a user should cascade delete courses and grades."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    grade = Grade(
        course_id=course.id,
        assessment_name="Test Assessment",
        max_score=100.0,
        weight=0.3,
    )
    session.add(grade)
    await session.flush()

    course_id = course.id
    await session.delete(user)
    await session.flush()

    result = await session.execute(select(Course).where(Course.id == course_id))
    assert result.scalar_one_or_none() is None

    result = await session.execute(select(Grade).where(Grade.course_id == course_id))
    assert result.scalar_one_or_none() is None


async def test_unique_email_constraint(session: AsyncSession) -> None:
    """Two users with the same email should raise IntegrityError."""
    user1 = _make_user(email="duplicate@test.com")
    session.add(user1)
    await session.flush()

    user2 = _make_user(email="duplicate@test.com")
    session.add(user2)
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_unique_dedup_key_constraint(session: AsyncSession) -> None:
    """Two deadlines with the same dedup_key should raise IntegrityError."""
    user = _make_user()
    session.add(user)
    await session.flush()

    course = _make_course(user.id)
    session.add(course)
    await session.flush()

    dedup_key = "c" * 64
    deadline1 = UnifiedDeadline(
        course_id=course.id,
        title="Deadline 1",
        due_date=datetime(2026, 4, 1, ),
        source="canvas_assignment",
        source_id="src_001",
        dedup_key=dedup_key,
    )
    session.add(deadline1)
    await session.flush()

    deadline2 = UnifiedDeadline(
        course_id=course.id,
        title="Deadline 2",
        due_date=datetime(2026, 4, 2, ),
        source="ed_lesson",
        source_id="src_002",
        dedup_key=dedup_key,
    )
    session.add(deadline2)
    with pytest.raises(IntegrityError):
        await session.flush()
