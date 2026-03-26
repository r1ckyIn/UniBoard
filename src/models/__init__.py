"""ORM models package -- import all models so Base.metadata is populated."""

from src.models.base import Base
from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.digest import Digest
from src.models.discussion import DiscussionThread
from src.models.embedding import ContentEmbedding
from src.models.grade import Grade
from src.models.lesson import Lesson, Slide
from src.models.module import Module, ModuleItem
from src.models.notification import Notification
from src.models.push_record import PushRecord
from src.models.unit_outline import UnitOutline
from src.models.user import Profile
from src.models.whatif import WhatIfScenario

__all__ = [
    "Base",
    "ContentEmbedding",
    "Course",
    "Digest",
    "DiscussionThread",
    "Grade",
    "Lesson",
    "Module",
    "ModuleItem",
    "Notification",
    "Profile",
    "PushRecord",
    "Slide",
    "UnifiedDeadline",
    "UnitOutline",
    "WhatIfScenario",
]
