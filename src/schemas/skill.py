"""Pydantic schemas and enums for the skill system."""

import enum


class SkillStatus(str, enum.Enum):
    """Skill lifecycle states per D-15: draft->active->needs_update->deprecated->archived."""

    DRAFT = "draft"
    ACTIVE = "active"
    NEEDS_UPDATE = "needs_update"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class SkillCategory(str, enum.Enum):
    """Skill taxonomy categories per D-03."""

    DATA_COLLECTION = "data_collection"
    DATA_PROCESSING = "data_processing"
    AI_ANALYSIS = "ai_analysis"
    USER_ACTION = "user_action"
