"""ORM models package -- import all models so Base.metadata is populated."""

from src.models.base import Base
from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.discussion import DiscussionThread
from src.models.grade import Grade
from src.models.lesson import Lesson, Slide
from src.models.module import Module, ModuleItem
from src.models.push_record import PushRecord
from src.models.unit_outline import UnitOutline
from src.models.user import User

__all__ = [
    "Base",
    "Course",
    "DiscussionThread",
    "Grade",
    "Lesson",
    "Module",
    "ModuleItem",
    "PushRecord",
    "Slide",
    "UnifiedDeadline",
    "UnitOutline",
    "User",
]
