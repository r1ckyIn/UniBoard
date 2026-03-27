"""Seed data factories for Phase 15 contract alignment tests.

Provides factory functions that create ORM objects directly in the test
database session, covering all entity types needed by Phase 15 endpoints:
courses, grades, deadlines, discussions, modules, and unit outlines.
"""

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.discussion import DiscussionThread
from src.models.grade import Grade
from src.models.module import Module, ModuleItem
from src.models.unit_outline import UnitOutline


async def seed_test_course(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    code: str = "COMP2017",
    name: str = "Systems Programming",
    credit_points: int = 6,
    semester: str = "2026-S1",
) -> Course:
    """Create and return a Course with the given parameters."""
    course = Course(
        user_id=user_id,
        name=name,
        code=code,
        semester=semester,
        credit_points=credit_points,
        canvas_course_id="canvas-12345",
        ed_course_id="ed-67890",
    )
    session.add(course)
    await session.flush()
    return course


async def seed_test_grades(
    session: AsyncSession,
    course_id: uuid.UUID,
    *,
    count: int = 3,
) -> list[Grade]:
    """Create a mix of graded and ungraded grade records.

    Default 3 grades:
    - Assignment 1: score=85, max=100, weight=0.3, group=Assignments (graded)
    - Quiz 1: score=70, max=100, weight=0.2, group=Quizzes (graded)
    - Midterm: score=None, max=100, weight=0.5, group=Exams (ungraded)
    """
    now = datetime.now(UTC)
    grade_data = [
        {
            "assessment_name": "Assignment 1",
            "score": 85.0,
            "max_score": 100.0,
            "weight": 0.3,
            "group_name": "Assignments",
            "graded_at": now - timedelta(days=14),
            "submitted_at": now - timedelta(days=15),
        },
        {
            "assessment_name": "Quiz 1",
            "score": 70.0,
            "max_score": 100.0,
            "weight": 0.2,
            "group_name": "Quizzes",
            "graded_at": now - timedelta(days=7),
            "submitted_at": now - timedelta(days=8),
        },
        {
            "assessment_name": "Midterm",
            "score": None,
            "max_score": 100.0,
            "weight": 0.5,
            "group_name": "Exams",
            "graded_at": None,
            "submitted_at": None,
        },
    ]

    grades: list[Grade] = []
    for data in grade_data[:count]:
        g = Grade(course_id=course_id, **data)
        session.add(g)
        grades.append(g)

    await session.flush()
    return grades


async def seed_test_deadlines(
    session: AsyncSession,
    course: Course,
    *,
    count: int = 3,
) -> list[UnifiedDeadline]:
    """Create a mix of upcoming, future, and past deadlines.

    Default 3 deadlines:
    - "Assignment 2" due in 3 days (upcoming)
    - "Final Project" due in 10 days (future)
    - "Quiz 2" due 2 days ago (past/overdue)
    """
    now = datetime.now(UTC)
    deadline_data = [
        {
            "title": "Assignment 2",
            "due_date": now + timedelta(days=3),
            "source": "canvas",
            "source_id": "canvas-asgn-2",
            "weight": 0.2,
            "is_confirmed": True,
            "description": "Programming assignment on memory management",
        },
        {
            "title": "Final Project",
            "due_date": now + timedelta(days=10),
            "source": "canvas",
            "source_id": "canvas-proj-1",
            "weight": 0.3,
            "is_confirmed": True,
            "description": "Final course project submission",
        },
        {
            "title": "Quiz 2",
            "due_date": now - timedelta(days=2),
            "source": "ed_lessons",
            "source_id": "ed-quiz-2",
            "weight": 0.1,
            "is_confirmed": True,
            "description": "Weekly quiz on pointers",
        },
    ]

    deadlines: list[UnifiedDeadline] = []
    for data in deadline_data[:count]:
        # Generate dedup_key from source + source_id
        raw = f"{data['source']}:{data['source_id']}"
        dedup_key = hashlib.sha256(raw.encode()).hexdigest()[:64]
        dl = UnifiedDeadline(
            course_id=course.id,
            dedup_key=dedup_key,
            **data,
        )
        session.add(dl)
        deadlines.append(dl)

    await session.flush()
    return deadlines


async def seed_test_discussions(
    session: AsyncSession,
    course_id: uuid.UUID,
    *,
    count: int = 5,
) -> list[DiscussionThread]:
    """Create a mix of endorsed, staff, and community discussion threads.

    Default 5 threads:
    - 2 endorsed (by staff, with high relevance)
    - 1 staff post (not endorsed)
    - 2 community posts (neither endorsed nor staff)
    """
    now = datetime.now(UTC)
    thread_data = [
        {
            "ed_thread_id": "ed-thread-001",
            "title": "Clarification on Assignment 2 marking criteria",
            "author": "Prof. Smith",
            "category": "Assignments",
            "content": "The marking criteria for Assignment 2 has been updated. Please review the rubric.",
            "is_endorsed": True,
            "is_staff_post": True,
            "gpa_relevance_score": 0.8,
            "created_at": now - timedelta(days=1),
        },
        {
            "ed_thread_id": "ed-thread-002",
            "title": "Exam format and allowed materials",
            "author": "Dr. Johnson",
            "category": "Exams",
            "content": "The midterm will be 2 hours. You may bring one A4 cheat sheet.",
            "is_endorsed": True,
            "is_staff_post": False,
            "gpa_relevance_score": 0.7,
            "created_at": now - timedelta(days=2),
        },
        {
            "ed_thread_id": "ed-thread-003",
            "title": "Office hours schedule change",
            "author": "TA Chen",
            "category": "General",
            "content": "Office hours moved to Wednesday 2-4pm in room 305.",
            "is_endorsed": False,
            "is_staff_post": True,
            "gpa_relevance_score": 0.3,
            "created_at": now - timedelta(days=3),
        },
        {
            "ed_thread_id": "ed-thread-004",
            "title": "Help with pointer arithmetic",
            "author": "Alice Student",
            "category": "Questions",
            "content": "I am confused about pointer arithmetic in C. Can someone explain?",
            "is_endorsed": False,
            "is_staff_post": False,
            "gpa_relevance_score": 0.0,
            "created_at": now - timedelta(days=4),
        },
        {
            "ed_thread_id": "ed-thread-005",
            "title": "Study group for midterm",
            "author": "Bob Student",
            "category": "General",
            "content": "Looking for study partners for the upcoming midterm.",
            "is_endorsed": False,
            "is_staff_post": False,
            "gpa_relevance_score": 0.0,
            "created_at": now - timedelta(days=5),
        },
    ]

    threads: list[DiscussionThread] = []
    for data in thread_data[:count]:
        thread = DiscussionThread(course_id=course_id, **data)
        session.add(thread)
        threads.append(thread)

    await session.flush()
    return threads


async def seed_test_modules(
    session: AsyncSession,
    course_id: uuid.UUID,
    *,
    count: int = 2,
) -> list[Module]:
    """Create modules with child items.

    Default 2 modules:
    - "Week 1: Introduction" with 2 items (File, Page)
    - "Week 2: Pointers" with 2 items (Assignment, Page)
    """
    module_data = [
        {
            "canvas_module_id": "mod-001",
            "name": "Week 1: Introduction",
            "position": 1,
            "ai_description": "Introduction to systems programming concepts",
            "items": [
                {"title": "Lecture Slides 1", "type": "File", "url": "https://canvas.example.com/file1"},
                {"title": "Lab 1 Instructions", "type": "Page", "url": "https://canvas.example.com/page1"},
            ],
        },
        {
            "canvas_module_id": "mod-002",
            "name": "Week 2: Pointers",
            "position": 2,
            "ai_description": "Deep dive into pointer arithmetic and memory",
            "items": [
                {"title": "Assignment 1 Spec", "type": "Assignment", "url": "https://canvas.example.com/asgn1"},
                {"title": "Pointer Tutorial", "type": "Page", "url": "https://canvas.example.com/page2"},
            ],
        },
    ]

    modules: list[Module] = []
    for data in module_data[:count]:
        items_data = data.pop("items")
        module = Module(course_id=course_id, **data)
        session.add(module)
        await session.flush()

        for item_data in items_data:
            item = ModuleItem(module_id=module.id, **item_data)
            session.add(item)

        modules.append(module)

    await session.flush()
    return modules


async def seed_test_outline(
    session: AsyncSession,
    course_id: uuid.UUID,
) -> UnitOutline:
    """Create a UnitOutline with assessment_weights JSON and learning_outcomes."""
    outline = UnitOutline(
        course_id=course_id,
        outline_url="https://www.sydney.edu.au/units/COMP2017/2026-S1",
        assessments=[
            {
                "name": "Assignment 1",
                "weight": 0.3,
                "description": "Programming assignment on memory management",
                "due_date": "2026-04-01",
                "length": "2 weeks",
                "ai_policy": "Not permitted",
            },
            {
                "name": "Midterm Exam",
                "weight": 0.2,
                "description": "In-class examination covering weeks 1-6",
                "due_date": "2026-04-15",
            },
            {
                "name": "Final Project",
                "weight": 0.5,
                "description": "Multi-stage systems programming project",
                "due_date": "2026-06-01",
                "length": "6 weeks",
                "ai_policy": "Permitted with disclosure",
            },
        ],
        learning_outcomes=[
            "Understand memory management in C",
            "Apply pointer arithmetic correctly",
            "Design and implement concurrent programs",
            "Analyze system-level performance",
        ],
        fetched_at=datetime.now(UTC),
        semester="2026-S1",
    )
    session.add(outline)
    await session.flush()
    return outline


async def seed_full_phase15_data(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> dict:
    """Seed one complete course with all related entities for Phase 15 tests.

    Returns a dict with keys: course, grades, deadlines, discussions, modules, outline.
    """
    course = await seed_test_course(session, user_id)
    grades = await seed_test_grades(session, course.id)
    deadlines = await seed_test_deadlines(session, course)
    discussions = await seed_test_discussions(session, course.id)
    modules = await seed_test_modules(session, course.id)
    outline = await seed_test_outline(session, course.id)

    return {
        "course": course,
        "grades": grades,
        "deadlines": deadlines,
        "discussions": discussions,
        "modules": modules,
        "outline": outline,
    }
