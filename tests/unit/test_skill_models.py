"""Unit tests for Skill and SkillExecution ORM models and schema enums."""

import uuid


class TestSkillStatus:
    """Test SkillStatus enum has all 5 lifecycle states per D-15."""

    def test_has_five_states(self) -> None:
        from src.schemas.skill import SkillStatus

        assert len(SkillStatus) == 5

    def test_draft_state(self) -> None:
        from src.schemas.skill import SkillStatus

        assert SkillStatus.DRAFT.value == "draft"

    def test_active_state(self) -> None:
        from src.schemas.skill import SkillStatus

        assert SkillStatus.ACTIVE.value == "active"

    def test_needs_update_state(self) -> None:
        from src.schemas.skill import SkillStatus

        assert SkillStatus.NEEDS_UPDATE.value == "needs_update"

    def test_deprecated_state(self) -> None:
        from src.schemas.skill import SkillStatus

        assert SkillStatus.DEPRECATED.value == "deprecated"

    def test_archived_state(self) -> None:
        from src.schemas.skill import SkillStatus

        assert SkillStatus.ARCHIVED.value == "archived"


class TestSkillCategory:
    """Test SkillCategory enum has 4 categories per D-03."""

    def test_has_four_categories(self) -> None:
        from src.schemas.skill import SkillCategory

        assert len(SkillCategory) == 4

    def test_data_collection(self) -> None:
        from src.schemas.skill import SkillCategory

        assert SkillCategory.DATA_COLLECTION.value == "data_collection"

    def test_data_processing(self) -> None:
        from src.schemas.skill import SkillCategory

        assert SkillCategory.DATA_PROCESSING.value == "data_processing"

    def test_ai_analysis(self) -> None:
        from src.schemas.skill import SkillCategory

        assert SkillCategory.AI_ANALYSIS.value == "ai_analysis"

    def test_user_action(self) -> None:
        from src.schemas.skill import SkillCategory

        assert SkillCategory.USER_ACTION.value == "user_action"


class TestSkillModel:
    """Test Skill ORM model instantiation and defaults."""

    def test_instantiation_with_required_fields(self) -> None:
        from src.models.skill import Skill

        skill = Skill(
            operation_type="fetch_grades",
            category="data_collection",
            system_prompt="Fetch student grades from Canvas.",
            status="active",
        )
        assert skill.operation_type == "fetch_grades"
        assert skill.category == "data_collection"
        assert skill.system_prompt == "Fetch student grades from Canvas."
        assert skill.status == "active"

    def test_nullable_course_id_none(self) -> None:
        """Global skills have course_id=None per D-02."""
        from src.models.skill import Skill

        skill = Skill(
            operation_type="global_op",
            category="ai_analysis",
            system_prompt="Global skill prompt.",
        )
        assert skill.course_id is None

    def test_nullable_course_id_uuid(self) -> None:
        """Per-course skills have a UUID course_id per D-02."""
        from src.models.skill import Skill

        cid = uuid.uuid4()
        skill = Skill(
            operation_type="course_op",
            category="data_processing",
            system_prompt="Course-specific prompt.",
            course_id=cid,
        )
        assert skill.course_id == cid

    def test_jsonb_columns_accept_dicts(self) -> None:
        """JSONB columns accept dict values per D-01, D-07b."""
        from src.models.skill import Skill

        wf = {"steps": ["step1", "step2"]}
        ts = {"tools": ["tool_a"]}
        params = {"temp": 0.7}
        skill = Skill(
            operation_type="test_jsonb",
            category="ai_analysis",
            system_prompt="Test.",
            workflow_steps=wf,
            tool_sequence=ts,
            parameters=params,
        )
        assert skill.workflow_steps == wf
        assert skill.tool_sequence == ts
        assert skill.parameters == params

    def test_default_values(self) -> None:
        """Default values: version=1, success_count=0, failure_count=0, is_seeded=False."""
        from src.models.skill import Skill

        _skill = Skill(
            operation_type="default_test",
            category="user_action",
            system_prompt="Defaults.",
        )
        # ORM column defaults are set at flush time, but we can check them
        # through the Column's default attribute or by checking the class itself
        # For in-memory instantiation without session, defaults may be None.
        # We verify via the column definitions instead.
        col_defaults = {
            c.name: c.default for c in Skill.__table__.columns if c.default is not None
        }
        assert col_defaults["version"].arg == 1
        assert col_defaults["success_count"].arg == 0
        assert col_defaults["failure_count"].arg == 0
        assert col_defaults["is_seeded"].arg is False
        assert col_defaults["status"].arg == "draft"

    def test_tablename(self) -> None:
        from src.models.skill import Skill

        assert Skill.__tablename__ == "skills"

    def test_lookup_index_exists(self) -> None:
        """Composite index ix_skills_lookup on (operation_type, course_id, status)."""
        from src.models.skill import Skill

        index_names = [idx.name for idx in Skill.__table__.indexes]
        assert "ix_skills_lookup" in index_names


class TestSkillExecutionModel:
    """Test SkillExecution ORM model instantiation."""

    def test_instantiation(self) -> None:
        from src.models.skill import SkillExecution

        execution = SkillExecution(
            operation_type="fetch_grades",
            success=True,
            latency_ms=120,
            tokens_used=500,
        )
        assert execution.operation_type == "fetch_grades"
        assert execution.success is True
        assert execution.latency_ms == 120
        assert execution.tokens_used == 500

    def test_execution_trace_jsonb(self) -> None:
        from src.models.skill import SkillExecution

        trace = {"steps": [{"tool": "canvas", "duration_ms": 80}]}
        execution = SkillExecution(
            operation_type="test_trace",
            execution_trace=trace,
        )
        assert execution.execution_trace == trace

    def test_nullable_skill_id(self) -> None:
        """NULL skill_id means exploration (no skill used)."""
        from src.models.skill import SkillExecution

        execution = SkillExecution(operation_type="explore")
        assert execution.skill_id is None

    def test_tablename(self) -> None:
        from src.models.skill import SkillExecution

        assert SkillExecution.__tablename__ == "skill_executions"

    def test_lookup_index_exists(self) -> None:
        """Composite index ix_skill_exec_lookup on (operation_type, course_id, success)."""
        from src.models.skill import SkillExecution

        index_names = [idx.name for idx in SkillExecution.__table__.indexes]
        assert "ix_skill_exec_lookup" in index_names


class TestSkillModelImport:
    """Test models are importable from the package."""

    def test_import_from_models_package(self) -> None:
        from src.models import Skill, SkillExecution

        assert Skill is not None
        assert SkillExecution is not None
