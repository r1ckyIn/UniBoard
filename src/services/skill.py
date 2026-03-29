"""Skill system service: lookup, trace, auto-generation, lifecycle management."""

from __future__ import annotations

import uuid
from datetime import datetime
from difflib import SequenceMatcher

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.skill import Skill, SkillExecution
from src.schemas.skill import SkillCategory, SkillStatus

logger = structlog.get_logger()

# Max length for tool output in execution traces (prevent JSONB bloat)
_TRACE_OUTPUT_MAX_CHARS = 2000

# Similarity threshold for auto-generating skills from traces
_SIMILARITY_THRESHOLD = 0.7

# Degradation threshold for skill success rate
_DEGRADATION_THRESHOLD = 0.7


# Seeded skill definitions covering all 4 categories
_SEEDED_SKILLS: list[dict[str, object]] = [
    # data_collection
    {
        "operation_type": "deadline_check",
        "category": SkillCategory.DATA_COLLECTION.value,
        "system_prompt": "Collect and verify upcoming deadlines from Canvas and Ed platforms.",
        "workflow_steps": {"steps": ["fetch_canvas_assignments", "fetch_ed_deadlines", "merge_deduplicate"]},
        "tool_sequence": {"tools": ["search_canvas_modules", "search_ed_threads"]},
    },
    {
        "operation_type": "course_overview",
        "category": SkillCategory.DATA_COLLECTION.value,
        "system_prompt": "Collect course structure, modules, and materials overview from Canvas.",
        "workflow_steps": {"steps": ["fetch_modules", "summarize_structure"]},
        "tool_sequence": {"tools": ["search_canvas_modules"]},
    },
    {
        "operation_type": "assessment_analysis",
        "category": SkillCategory.DATA_COLLECTION.value,
        "system_prompt": "Collect assessment details, weights, and deadlines from course materials.",
        "workflow_steps": {"steps": ["fetch_assignments", "parse_weights", "compile_overview"]},
        "tool_sequence": {"tools": ["search_canvas_modules"]},
    },
    # data_processing
    {
        "operation_type": "grade_aggregation",
        "category": SkillCategory.DATA_PROCESSING.value,
        "system_prompt": "Aggregate and normalize grade data across assessment items.",
        "workflow_steps": {"steps": ["collect_grades", "normalize", "calculate_weighted_average"]},
        "tool_sequence": None,
    },
    {
        "operation_type": "deadline_dedup",
        "category": SkillCategory.DATA_PROCESSING.value,
        "system_prompt": "Deduplicate deadlines from multiple sources using SHA-256 hashing.",
        "workflow_steps": {"steps": ["hash_deadlines", "merge_duplicates", "sort_chronological"]},
        "tool_sequence": None,
    },
    {
        "operation_type": "weight_parsing",
        "category": SkillCategory.DATA_PROCESSING.value,
        "system_prompt": "Parse assessment weight information from unit outlines and course pages.",
        "workflow_steps": {"steps": ["extract_weights", "validate_sum", "normalize"]},
        "tool_sequence": None,
    },
    # ai_analysis (import prompts lazily to avoid circular imports)
    {
        "operation_type": "qa_direct",
        "category": SkillCategory.AI_ANALYSIS.value,
        "system_prompt": "_LAZY_QA",
        "workflow_steps": {"steps": ["load_context", "generate_answer", "cite_sources"]},
        "tool_sequence": {"tools": ["search_canvas_modules", "search_ed_threads", "get_ed_lesson_content"]},
    },
    {
        "operation_type": "qa_rag",
        "category": SkillCategory.AI_ANALYSIS.value,
        "system_prompt": "_LAZY_QA",
        "workflow_steps": {"steps": ["embed_query", "retrieve_chunks", "generate_answer"]},
        "tool_sequence": None,
    },
    {
        "operation_type": "thread_evaluation",
        "category": SkillCategory.AI_ANALYSIS.value,
        "system_prompt": "_LAZY_THREAD_EVAL",
        "workflow_steps": {"steps": ["parse_thread", "score_relevance", "extract_facts"]},
        "tool_sequence": None,
    },
    {
        "operation_type": "unit_review",
        "category": SkillCategory.AI_ANALYSIS.value,
        "system_prompt": "_LAZY_REVIEW",
        "workflow_steps": {"steps": ["load_materials", "generate_review", "structure_output"]},
        "tool_sequence": None,
    },
    {
        "operation_type": "digest_scoring",
        "category": SkillCategory.AI_ANALYSIS.value,
        "system_prompt": "_LAZY_DIGEST",
        "workflow_steps": {"steps": ["collect_items", "score_urgency", "rank_relevance"]},
        "tool_sequence": None,
    },
    {
        "operation_type": "risk_analysis",
        "category": SkillCategory.AI_ANALYSIS.value,
        "system_prompt": "_LAZY_RISK",
        "workflow_steps": {"steps": ["analyze_gap", "identify_priorities", "generate_recommendations"]},
        "tool_sequence": None,
    },
    # user_action
    {
        "operation_type": "translation",
        "category": SkillCategory.USER_ACTION.value,
        "system_prompt": "_LAZY_TRANSLATION",
        "workflow_steps": {"steps": ["batch_items", "translate", "validate_json"]},
        "tool_sequence": None,
    },
]


def _resolve_lazy_prompt(marker: str) -> str:
    """Resolve lazy prompt markers to actual prompt constants."""
    if marker == "_LAZY_QA":
        from src.prompts.qa import QA_SYSTEM_PROMPT
        return QA_SYSTEM_PROMPT
    elif marker == "_LAZY_THREAD_EVAL":
        from src.prompts.thread_eval import THREAD_EVAL_SYSTEM_PROMPT
        return THREAD_EVAL_SYSTEM_PROMPT
    elif marker == "_LAZY_REVIEW":
        from src.prompts.review import REVIEW_SYSTEM_PROMPT
        return REVIEW_SYSTEM_PROMPT
    elif marker == "_LAZY_DIGEST":
        from src.prompts.digest import DIGEST_URGENCY_SYSTEM_PROMPT
        return DIGEST_URGENCY_SYSTEM_PROMPT
    elif marker == "_LAZY_RISK":
        from src.prompts.risk_analysis import GPA_RISK_ANALYSIS_SYSTEM_PROMPT
        return GPA_RISK_ANALYSIS_SYSTEM_PROMPT
    elif marker == "_LAZY_TRANSLATION":
        from src.prompts.translation import TRANSLATION_SYSTEM_PROMPT
        return TRANSLATION_SYSTEM_PROMPT
    return marker


class SkillService:
    """Skill lifecycle management: lookup, trace recording, auto-generation, degradation.

    This is a data service (per Research pitfall 6) — does NOT import AIEngine.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_skill(
        self,
        operation_type: str,
        course_id: uuid.UUID | None,
    ) -> Skill | None:
        """Two-phase skill lookup: per-course first, then global fallback.

        Per D-05: Returns the most specific active skill for the operation.
        """
        if course_id is not None:
            stmt = select(Skill).where(
                Skill.operation_type == operation_type,
                Skill.course_id == course_id,
                Skill.status == SkillStatus.ACTIVE.value,
            )
            result = await self._session.execute(stmt)
            skill = result.scalar_one_or_none()
            if skill is not None:
                return skill

        # Global fallback — .is_(None) required for SQL NULL comparison
        stmt = select(Skill).where(
            Skill.operation_type == operation_type,
            Skill.course_id.is_(None),
            Skill.status == SkillStatus.ACTIVE.value,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def record_execution(
        self,
        operation_type: str,
        course_id: uuid.UUID | None,
        execution_trace: list[dict[str, object]],
        success: bool,
        latency_ms: int,
        tokens_used: int,
        skill_id: uuid.UUID | None = None,
    ) -> SkillExecution:
        """Record an execution trace for analytics and auto-generation.

        Per D-07b: Truncates tool outputs to prevent JSONB bloat.
        """
        # Truncate each tool output in the trace
        truncated_trace: list[dict[str, object]] = []
        for step in execution_trace:
            truncated_step = dict(step)
            output = str(truncated_step.get("output", ""))
            if len(output) > _TRACE_OUTPUT_MAX_CHARS:
                truncated_step["output"] = output[:_TRACE_OUTPUT_MAX_CHARS]
            truncated_trace.append(truncated_step)

        execution = SkillExecution(
            operation_type=operation_type,
            course_id=course_id,
            skill_id=skill_id,
            execution_trace=truncated_trace,  # type: ignore[arg-type]
            success=success,
            latency_ms=latency_ms,
            tokens_used=tokens_used,
        )
        self._session.add(execution)
        await self._session.flush()

        logger.info(
            "skill_execution_recorded",
            operation_type=operation_type,
            success=success,
            latency_ms=latency_ms,
        )
        return execution

    async def maybe_generate_skill(
        self,
        operation_type: str,
        course_id: uuid.UUID | None,
    ) -> Skill | None:
        """Auto-generate a draft skill when 2+ traces have >70% tool sequence similarity.

        Per D-07: Analyzes recent successful executions for repeating patterns.
        Per D-09: Deduplicates by incrementing version on existing skill.
        """
        # Query last 5 successful executions
        stmt = (
            select(SkillExecution)
            .where(
                SkillExecution.operation_type == operation_type,
                SkillExecution.success.is_(True),
            )
            .order_by(SkillExecution.created_at.desc())
            .limit(5)
        )
        # Add course_id filter
        if course_id is not None:
            stmt = stmt.where(SkillExecution.course_id == course_id)
        else:
            stmt = stmt.where(SkillExecution.course_id.is_(None))

        result = await self._session.execute(stmt)
        traces = result.scalars().all()

        if len(traces) < 2:
            return None

        # Extract tool sequences from the 2 most recent traces
        trace_a = traces[0].execution_trace or []
        trace_b = traces[1].execution_trace or []
        steps_a = [step.get("tool_name", "") for step in trace_a]
        steps_b = [step.get("tool_name", "") for step in trace_b]

        similarity = SequenceMatcher(None, steps_a, steps_b).ratio()
        if similarity < _SIMILARITY_THRESHOLD:
            return None

        # Use the longer trace as the pattern (superset)
        common_steps = steps_a if len(steps_a) >= len(steps_b) else steps_b
        unique_tools = list(dict.fromkeys(common_steps))  # Preserve order, deduplicate

        # Infer category from operation_type prefix
        category = self._infer_category(operation_type)

        # Check for existing skill (D-09 dedup)
        existing_stmt = select(Skill).where(
            Skill.operation_type == operation_type,
        )
        if course_id is not None:
            existing_stmt = existing_stmt.where(Skill.course_id == course_id)
        else:
            existing_stmt = existing_stmt.where(Skill.course_id.is_(None))

        existing_result = await self._session.execute(existing_stmt)
        existing_skill = existing_result.scalars().first()

        if existing_skill is not None:
            # Increment version, update pattern
            existing_skill.version += 1
            existing_skill.workflow_steps = {"steps": common_steps}  # type: ignore[assignment]
            existing_skill.tool_sequence = {"tools": unique_tools}  # type: ignore[assignment]
            existing_skill.status = SkillStatus.DRAFT.value
            await self._session.flush()
            logger.info(
                "skill_version_incremented",
                operation_type=operation_type,
                version=existing_skill.version,
            )
            return existing_skill

        # Create new skill
        skill = Skill(
            operation_type=operation_type,
            category=category,
            course_id=course_id,
            system_prompt=(
                f"Auto-generated skill for {operation_type}. "
                f"Optimized tool sequence based on {len(traces)} successful executions."
            ),
            workflow_steps={"steps": common_steps},  # type: ignore[arg-type]
            tool_sequence={"tools": unique_tools},  # type: ignore[arg-type]
            status=SkillStatus.DRAFT.value,
            is_seeded=False,
            version=1,
        )
        self._session.add(skill)
        await self._session.flush()

        logger.info(
            "skill_auto_generated",
            operation_type=operation_type,
            course_id=str(course_id) if course_id else None,
            similarity=round(similarity, 2),
        )
        return skill

    async def mark_success(self, skill_id: uuid.UUID) -> None:
        """Record a successful execution. Transitions draft -> active on first success.

        Per D-08: First successful replay activates a draft skill.
        """
        stmt = select(Skill).where(Skill.id == skill_id)
        result = await self._session.execute(stmt)
        skill = result.scalar_one_or_none()
        if skill is None:
            return

        skill.success_count += 1
        skill.last_used_at = datetime.utcnow()

        if skill.status == SkillStatus.DRAFT.value:
            skill.status = SkillStatus.ACTIVE.value
            logger.info("skill_activated", skill_id=str(skill_id))

        await self._session.flush()

    async def mark_failure(self, skill_id: uuid.UUID) -> None:
        """Record a failed execution and check for degradation.

        Per D-08: Increments failure count and triggers degradation check.
        """
        stmt = select(Skill).where(Skill.id == skill_id)
        result = await self._session.execute(stmt)
        skill = result.scalar_one_or_none()
        if skill is None:
            return

        skill.failure_count += 1
        await self._session.flush()
        self._check_degradation(skill)

    def _check_degradation(self, skill: Skill) -> None:
        """Transition active -> needs_update when success_rate < 70%."""
        total = skill.success_count + skill.failure_count
        if total == 0:
            return

        success_rate = skill.success_count / total
        if success_rate < _DEGRADATION_THRESHOLD and skill.status == SkillStatus.ACTIVE.value:
            skill.status = SkillStatus.NEEDS_UPDATE.value
            logger.warning(
                "skill_degraded",
                skill_id=str(skill.id),
                success_rate=round(success_rate, 2),
                total_executions=total,
            )

    async def seed_skills(self) -> int:
        """Seed starter skills from predefined templates.

        Per D-10: Idempotent — skips already-seeded skills.
        Returns count of skills created.
        """
        # Batch-fetch existing seeded operation_types to avoid N+1
        existing_result = await self._session.execute(
            select(Skill.operation_type).where(
                Skill.course_id.is_(None),
                Skill.is_seeded.is_(True),
            )
        )
        existing_ops = {row[0] for row in existing_result.all()}

        created = 0
        for defn in _SEEDED_SKILLS:
            op_type = str(defn["operation_type"])
            if op_type in existing_ops:
                continue

            prompt = str(defn["system_prompt"])
            if prompt.startswith("_LAZY_"):
                prompt = _resolve_lazy_prompt(prompt)

            skill = Skill(
                operation_type=op_type,
                category=str(defn["category"]),
                course_id=None,
                system_prompt=prompt,
                workflow_steps=defn.get("workflow_steps"),  # type: ignore[arg-type]
                tool_sequence=defn.get("tool_sequence"),  # type: ignore[arg-type]
                status=SkillStatus.ACTIVE.value,
                is_seeded=True,
                version=1,
            )
            self._session.add(skill)
            created += 1

        if created > 0:
            await self._session.flush()
            logger.info("skills_seeded", count=created)

        return created

    @staticmethod
    def _infer_category(operation_type: str) -> str:
        """Infer skill category from operation_type naming convention."""
        prefixes = {
            "deadline": SkillCategory.DATA_COLLECTION.value,
            "course": SkillCategory.DATA_COLLECTION.value,
            "assessment": SkillCategory.DATA_COLLECTION.value,
            "grade": SkillCategory.DATA_PROCESSING.value,
            "weight": SkillCategory.DATA_PROCESSING.value,
            "dedup": SkillCategory.DATA_PROCESSING.value,
            "translation": SkillCategory.USER_ACTION.value,
        }
        for prefix, category in prefixes.items():
            if prefix in operation_type:
                return category
        # Default to ai_analysis
        return SkillCategory.AI_ANALYSIS.value
