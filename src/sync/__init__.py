"""Background sync engine package."""

from src.sync.courses import sync_all_courses
from src.sync.deadlines import sync_all_deadlines
from src.sync.discussions import sync_ed_discussions
from src.sync.grades import sync_all_grades
from src.sync.modules import sync_all_modules
from src.sync.outlines import sync_all_outlines
from src.sync.scheduled import (
    check_deadline_reminders,
    check_token_health,
    embed_hot_courses_worker_task,
    generate_daily_digests,
    generate_study_recommendations_daily,
)

__all__ = [
    "check_deadline_reminders",
    "check_token_health",
    "embed_hot_courses_worker_task",
    "generate_daily_digests",
    "generate_study_recommendations_daily",
    "sync_all_courses",
    "sync_all_deadlines",
    "sync_all_grades",
    "sync_all_modules",
    "sync_all_outlines",
    "sync_ed_discussions",
]
