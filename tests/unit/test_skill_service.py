"""Unit tests for SkillService — lookup, trace, auto-generation, lifecycle."""

from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.schemas.skill import SkillCategory, SkillStatus


def _mock_skill(
    operation_type: str = "qa_direct",
    course_id: uuid.UUID | None = None,
    status: str = "active",
    is_seeded: bool = False,
    version: int = 1,
    success_count: int = 5,
    failure_count: int = 0,
) -> MagicMock:
    """Create a mock Skill ORM object."""
    skill = MagicMock()
    skill.id = uuid.uuid4()
    skill.operation_type = operation_type
    skill.course_id = course_id
    skill.status = status
    skill.is_seeded = is_seeded
    skill.version = version
    skill.success_count = success_count
    skill.failure_count = failure_count
    skill.category = "ai_analysis"
    skill.system_prompt = "Test prompt"
    skill.workflow_steps = None
    skill.tool_sequence = None
    skill.last_used_at = None
    return skill


def _mock_execution(
    operation_type: str = "qa_direct",
    course_id: uuid.UUID | None = None,
    tool_sequence: list[str] | None = None,
    success: bool = True,
) -> MagicMock:
    """Create a mock SkillExecution ORM object."""
    execution = MagicMock()
    execution.id = uuid.uuid4()
    execution.operation_type = operation_type
    execution.course_id = course_id
    execution.success = success
    execution.latency_ms = 500
    execution.tokens_used = 1000
    if tool_sequence is None:
        tool_sequence = ["search_canvas_modules", "search_ed_threads"]
    execution.execution_trace = [
        {"tool_name": t, "input": {}, "output": "result"}
        for t in tool_sequence
    ]
    execution.created_at = datetime.utcnow()
    return execution


class TestSkillServiceLookup:
    """Test two-phase skill lookup (per-course -> global -> None)."""

    @pytest.mark.asyncio
    async def test_lookup_per_course(self) -> None:
        """Test 1: get_skill returns per-course skill when one exists."""
        from src.services.skill import SkillService

        course_id = uuid.uuid4()
        per_course_skill = _mock_skill(course_id=course_id)

        session = AsyncMock()
        # Phase 1 query returns the per-course skill
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = per_course_skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        result = await svc.get_skill("qa_direct", course_id)

        assert result is per_course_skill
        session.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_lookup_global_fallback(self) -> None:
        """Test 2: get_skill falls back to global skill when no per-course match."""
        from src.services.skill import SkillService

        course_id = uuid.uuid4()
        global_skill = _mock_skill(course_id=None)

        session = AsyncMock()
        mock_result_none = MagicMock()
        mock_result_none.scalar_one_or_none.return_value = None
        mock_result_global = MagicMock()
        mock_result_global.scalar_one_or_none.return_value = global_skill

        # First call (per-course) returns None, second call (global) returns skill
        session.execute.side_effect = [mock_result_none, mock_result_global]

        svc = SkillService(session)
        result = await svc.get_skill("qa_direct", course_id)

        assert result is global_skill
        assert session.execute.await_count == 2

    @pytest.mark.asyncio
    async def test_lookup_no_match(self) -> None:
        """Test 3: get_skill returns None when no skill exists."""
        from src.services.skill import SkillService

        session = AsyncMock()
        mock_result_none = MagicMock()
        mock_result_none.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result_none

        svc = SkillService(session)
        result = await svc.get_skill("unknown_op", uuid.uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_course_differentiation(self) -> None:
        """Test 10: Per-course skill is returned over global skill."""
        from src.services.skill import SkillService

        course_id = uuid.uuid4()
        per_course_skill = _mock_skill(course_id=course_id)

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = per_course_skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        result = await svc.get_skill("qa_direct", course_id)

        # Should return per-course, only 1 query needed
        assert result is per_course_skill
        assert result.course_id == course_id
        session.execute.assert_awaited_once()


class TestSkillServiceTraceRecording:
    """Test execution trace recording."""

    @pytest.mark.asyncio
    async def test_record_execution(self) -> None:
        """Test 4: record_execution creates SkillExecution row."""
        from src.services.skill import SkillService

        session = AsyncMock()

        svc = SkillService(session)
        trace = [
            {"tool_name": "search_canvas_modules", "input": {}, "output": "x" * 3000}
        ]
        result = await svc.record_execution(
            operation_type="qa_direct",
            course_id=uuid.uuid4(),
            execution_trace=trace,
            success=True,
            latency_ms=500,
            tokens_used=1000,
        )

        # Should have called session.add and session.flush
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

        # The added SkillExecution should have truncated output
        added_obj = session.add.call_args[0][0]
        assert added_obj.operation_type == "qa_direct"
        assert added_obj.success is True
        # Verify output truncation (3000 chars -> 2000)
        truncated_trace = added_obj.execution_trace
        assert len(truncated_trace[0]["output"]) <= 2000


class TestSkillServiceAutoGeneration:
    """Test auto-generation of skills from similar traces."""

    @pytest.mark.asyncio
    async def test_auto_generate_skill(self) -> None:
        """Test 5: maybe_generate_skill creates draft when 2+ traces >70% similar."""
        from src.services.skill import SkillService

        session = AsyncMock()

        # Return 2 similar traces
        trace_a = _mock_execution(
            tool_sequence=["search_canvas_modules", "search_ed_threads", "get_ed_lesson_content"]
        )
        trace_b = _mock_execution(
            tool_sequence=["search_canvas_modules", "search_ed_threads", "get_ed_lesson_content"]
        )

        mock_traces_result = MagicMock()
        mock_traces_result.scalars.return_value.all.return_value = [trace_a, trace_b]

        # No existing skill
        mock_skill_result = MagicMock()
        mock_skill_result.scalars.return_value.first.return_value = None

        session.execute.side_effect = [mock_traces_result, mock_skill_result]

        svc = SkillService(session)
        result = await svc.maybe_generate_skill("qa_direct", None)

        # Should have added a new skill
        session.add.assert_called_once()
        added = session.add.call_args[0][0]
        assert added.status == "draft"
        assert added.is_seeded is False
        assert added.operation_type == "qa_direct"

    @pytest.mark.asyncio
    async def test_skip_generation_insufficient_traces(self) -> None:
        """Test 6: maybe_generate_skill returns None when <2 traces."""
        from src.services.skill import SkillService

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            _mock_execution()
        ]  # Only 1 trace
        session.execute.return_value = mock_result

        svc = SkillService(session)
        result = await svc.maybe_generate_skill("qa_direct", None)

        assert result is None
        session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_skip_generation_low_similarity(self) -> None:
        """Test 7: maybe_generate_skill returns None when traces <70% similar."""
        from src.services.skill import SkillService

        session = AsyncMock()

        # Two very different traces
        trace_a = _mock_execution(
            tool_sequence=["search_canvas_modules", "search_canvas_modules", "search_canvas_modules"]
        )
        trace_b = _mock_execution(
            tool_sequence=["get_ed_lesson_content", "search_ed_threads"]
        )

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [trace_a, trace_b]
        session.execute.return_value = mock_result

        svc = SkillService(session)
        result = await svc.maybe_generate_skill("qa_direct", None)

        assert result is None

    @pytest.mark.asyncio
    async def test_dedup_increments_version(self) -> None:
        """Test 11: Auto-generation increments version when (op_type, course_id) exists."""
        from src.services.skill import SkillService

        session = AsyncMock()

        # Return 2 identical traces
        trace_a = _mock_execution(
            tool_sequence=["search_canvas_modules", "search_ed_threads"]
        )
        trace_b = _mock_execution(
            tool_sequence=["search_canvas_modules", "search_ed_threads"]
        )

        mock_traces_result = MagicMock()
        mock_traces_result.scalars.return_value.all.return_value = [trace_a, trace_b]

        # Existing skill found (version=1)
        existing_skill = _mock_skill(version=1, status="active")
        mock_skill_result = MagicMock()
        mock_skill_result.scalars.return_value.first.return_value = existing_skill

        session.execute.side_effect = [mock_traces_result, mock_skill_result]

        svc = SkillService(session)
        result = await svc.maybe_generate_skill("qa_direct", None)

        # Should update the existing skill instead of creating new one
        assert existing_skill.version == 2
        assert existing_skill.status == "draft"


class TestSkillServiceLifecycle:
    """Test skill lifecycle transitions."""

    @pytest.mark.asyncio
    async def test_lifecycle_draft_to_active(self) -> None:
        """Test 8: mark_success transitions draft to active."""
        from src.services.skill import SkillService

        skill_id = uuid.uuid4()
        skill = _mock_skill(status="draft", success_count=0)

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        await svc.mark_success(skill_id)

        assert skill.success_count == 1
        assert skill.status == "active"
        assert skill.last_used_at is not None

    @pytest.mark.asyncio
    async def test_mark_success_active_stays_active(self) -> None:
        """mark_success on active skill increments count, stays active."""
        from src.services.skill import SkillService

        skill_id = uuid.uuid4()
        skill = _mock_skill(status="active", success_count=5)

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        await svc.mark_success(skill_id)

        assert skill.success_count == 6
        assert skill.status == "active"

    @pytest.mark.asyncio
    async def test_degradation(self) -> None:
        """Test 9: check_degradation transitions active to needs_update when success_rate < 70%."""
        from src.services.skill import SkillService

        skill_id = uuid.uuid4()
        # 2 success, 5 failure -> success_rate = 2/7 = 0.286
        skill = _mock_skill(status="active", success_count=2, failure_count=5)

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        await svc.check_degradation(skill_id)

        assert skill.status == "needs_update"

    @pytest.mark.asyncio
    async def test_no_degradation_healthy_skill(self) -> None:
        """check_degradation does not change status when success_rate >= 70%."""
        from src.services.skill import SkillService

        skill_id = uuid.uuid4()
        # 8 success, 2 failure -> success_rate = 0.8
        skill = _mock_skill(status="active", success_count=8, failure_count=2)

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        await svc.check_degradation(skill_id)

        assert skill.status == "active"

    @pytest.mark.asyncio
    async def test_mark_failure_increments_and_checks(self) -> None:
        """mark_failure increments failure_count and calls check_degradation."""
        from src.services.skill import SkillService

        skill_id = uuid.uuid4()
        # After +1 failure: 2 success, 6 failure -> rate = 0.25 -> needs_update
        skill = _mock_skill(status="active", success_count=2, failure_count=5)

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = skill
        session.execute.return_value = mock_result

        svc = SkillService(session)
        await svc.mark_failure(skill_id)

        assert skill.failure_count == 6
        assert skill.status == "needs_update"


class TestSkillServiceSeed:
    """Test seed_skills creates starter skills."""

    @pytest.mark.asyncio
    async def test_seed_skills(self) -> None:
        """Test 12: seed_skills creates ~12 seeded skills across 4 categories."""
        from src.services.skill import SkillService

        session = AsyncMock()

        # No existing seeded skills
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result

        svc = SkillService(session)
        count = await svc.seed_skills()

        # Should create multiple skills
        assert count >= 10
        assert session.add.call_count == count

        # Verify categories are covered
        added_skills = [call[0][0] for call in session.add.call_args_list]
        categories = {s.category for s in added_skills}
        assert "data_collection" in categories
        assert "data_processing" in categories
        assert "ai_analysis" in categories
        assert "user_action" in categories

        # All should be seeded and active
        for s in added_skills:
            assert s.is_seeded is True
            assert s.status == "active"

    @pytest.mark.asyncio
    async def test_seed_skills_idempotent(self) -> None:
        """seed_skills skips already-seeded skills."""
        from src.services.skill import SkillService

        session = AsyncMock()

        # All skills already exist
        existing = _mock_skill(is_seeded=True)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing
        session.execute.return_value = mock_result

        svc = SkillService(session)
        count = await svc.seed_skills()

        assert count == 0
        session.add.assert_not_called()
