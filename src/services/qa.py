"""Course material Q&A service with hybrid direct-context / RAG architecture."""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime

import structlog
import tiktoken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config import get_settings
from src.models.course import Course
from src.models.module import Module
from src.models.user import Profile
from src.schemas.ai import QAResponse, UnitReviewResponse
from src.schemas.common import RateLimitedError
from src.services.ai_engine import AIEngine
from src.services.skill import SkillService
from src.services.tool_executor import ToolExecutor

logger = structlog.get_logger()

# tiktoken encoder for token counting (cl100k_base works for Claude models)
_ENCODER = tiktoken.get_encoding("cl100k_base")

# Below this token count, MCP agent fallback is automatically triggered
MCP_FALLBACK_TOKEN_THRESHOLD = get_settings().mcp_fallback_token_threshold


class QAService:
    """Course Q&A with hybrid direct-context / RAG depending on material size."""

    def __init__(
        self,
        session: AsyncSession,
        ai_engine: AIEngine,
        voyage_api_key: str = "",
        tool_executor: ToolExecutor | None = None,
        skill_service: SkillService | None = None,
    ) -> None:
        self._session = session
        self._ai_engine = ai_engine
        self._voyage_api_key = voyage_api_key
        self._tool_executor = tool_executor
        self._skill_service = skill_service

    async def _check_and_increment_limit(self, user_id: uuid.UUID) -> Profile:
        """Check AI daily limit and atomically increment counter. Raises RateLimitedError.

        Uses SELECT ... FOR UPDATE to prevent TOCTOU race conditions.
        """
        settings = get_settings()
        stmt = select(Profile).where(Profile.id == user_id).with_for_update()
        result = await self._session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise RateLimitedError("User not found")

        # Reset daily counter if date changed
        today = datetime.utcnow()
        if (
            user.ai_calls_reset_date is None
            or user.ai_calls_reset_date.date() < today.date()
        ):
            user.ai_calls_today = 0
            user.ai_calls_reset_date = today

        if user.ai_calls_today >= settings.ai_daily_limit_per_user:
            raise RateLimitedError(
                f"AI daily limit reached ({settings.ai_daily_limit_per_user} calls/day)"
            )

        # Increment atomically while row is locked
        user.ai_calls_today += 1
        await self._session.flush()

        return user

    async def _load_course_materials(
        self, course_id: uuid.UUID,
    ) -> tuple[Course, str]:
        """Load course with modules and lessons, return concatenated text with labels."""
        stmt = (
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules).selectinload(Module.items),
                selectinload(Course.lessons),
            )
        )
        result = await self._session.execute(stmt)
        course = result.scalar_one_or_none()
        if course is None:
            from src.schemas.common import NotFoundError
            raise NotFoundError("Course")

        # Concatenate all text content with source labels
        parts: list[str] = []

        for module in course.modules:
            for item in module.items:
                text = getattr(item, "text_content", None) or ""
                if text:
                    parts.append(f"[Canvas: {item.title}]\n{text}")

        for lesson in course.lessons:
            text = lesson.text_content or ""
            if text:
                parts.append(f"[Ed: {lesson.title}]\n{text}")

        materials_text = "\n\n---\n\n".join(parts)
        return course, materials_text

    async def answer_question(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
        question: str,
    ) -> QAResponse:
        """Answer a question about course materials.

        Uses direct context for small courses (< rag_token_threshold tokens),
        auto-switches to RAG for large courses.
        """
        await self._check_and_increment_limit(user_id)
        settings = get_settings()

        course, materials_text = await self._load_course_materials(course_id)

        # Count tokens to decide path
        total_tokens = len(_ENCODER.encode(materials_text))

        if total_tokens < settings.rag_token_threshold:
            result = await self._answer_direct(question, materials_text)
        else:
            result = await self._answer_rag(question, course_id)

        return result

    async def _answer_direct(
        self,
        question: str,
        materials_text: str,
    ) -> QAResponse:
        """Direct context Q&A: send all materials as context."""
        return await self._ai_engine.ask_question(
            question=question,
            context_text=materials_text,
        )

    async def _answer_rag(
        self,
        question: str,
        course_id: uuid.UUID,
    ) -> QAResponse:
        """RAG Q&A: embed question, retrieve similar chunks via pgvector."""
        settings = get_settings()

        try:
            import voyageai
            from pgvector.sqlalchemy import cosine_distance

            from src.models.embedding import ContentEmbedding

            # Embed the question
            vo = voyageai.Client(api_key=self._voyage_api_key)  # type: ignore[attr-defined]
            q_embedding = vo.embed(
                [question], model="voyage-3", input_type="query"
            ).embeddings[0]

            # Query similar chunks
            stmt = (
                select(ContentEmbedding)
                .where(ContentEmbedding.course_id == course_id)
                .order_by(cosine_distance(ContentEmbedding.embedding, q_embedding))
                .limit(settings.rag_top_k)
            )
            result = await self._session.execute(stmt)
            chunks = result.scalars().all()

            # Build context from retrieved chunks
            context_parts = [
                f"[{chunk.source_type}: chunk {chunk.chunk_index}]\n{chunk.chunk_text}"
                for chunk in chunks
            ]
            context_text = "\n\n---\n\n".join(context_parts)

            qa_result = await self._ai_engine.ask_question(
                question=question,
                context_text=context_text,
            )
            # Override method since we used RAG
            return QAResponse(
                answer=qa_result.answer,
                citations=qa_result.citations,
                method="rag",
                tokens_used=qa_result.tokens_used,
            )
        except ImportError:
            logger.warning("rag_fallback_no_voyageai", reason="voyageai not installed")
            # Fallback: load materials directly
            _, materials_text = await self._load_course_materials(course_id)
            return await self._answer_direct(question, materials_text)

    async def generate_review(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> UnitReviewResponse:
        """Generate an AI unit review summary for a course."""
        await self._check_and_increment_limit(user_id)

        course, materials_text = await self._load_course_materials(course_id)
        result = await self._ai_engine.generate_review(
            materials_text=materials_text,
            course_name=course.name,
        )

        # Enrich with course metadata
        result.course_id = str(course.id)
        result.course_name = course.name
        result.generated_at = datetime.utcnow().isoformat()

        return result

    async def stream_answer_question(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
        question: str,
        history: list[dict[str, str]] | None = None,
        search_more: bool = False,
        language: str = "en",
    ) -> AsyncGenerator[str, None]:
        """Stream Q&A answer. Uses direct context or MCP fallback.

        MCP fallback triggers when:
        (a) DB context token count < MCP_FALLBACK_TOKEN_THRESHOLD
        (b) search_more=True (user clicked "Search More")
        """
        await self._check_and_increment_limit(user_id)

        course, materials_text = await self._load_course_materials(course_id)
        total_tokens = len(_ENCODER.encode(materials_text))

        use_agent = search_more or total_tokens < MCP_FALLBACK_TOKEN_THRESHOLD

        if use_agent:
            # MCP agent fallback: use tool_use loop with adapter-backed tools
            from src.services.ai_engine import AGENT_TOOLS

            # Skill lookup per D-05: per-course -> global -> explore
            skill = None
            operation_type = "qa_agent"
            if self._skill_service:
                skill = await self._skill_service.get_skill(operation_type, course_id)

            # Use ToolExecutor if available, else fallback to placeholder
            if self._tool_executor:
                tool_fn = self._tool_executor.execute
            else:
                async def tool_fn(name: str, input_data: dict[str, object]) -> str:
                    return f"[Tool {name} called. No adapter connected.]"

            # Track execution for tracing
            start_time = time.monotonic()
            trace_steps: list[dict[str, object]] = []

            # Wrap tool_executor to capture trace
            async def _traced_executor(name: str, input_data: dict[str, object]) -> str:
                result = await tool_fn(name, input_data)
                trace_steps.append({
                    "tool_name": name,
                    "input": input_data,
                    "output": result[:2000],  # Truncate for storage
                })
                return result

            try:
                async for token in self._ai_engine.agent_stream(
                    question=question,
                    context_text=materials_text,
                    tools=AGENT_TOOLS,
                    tool_executor=_traced_executor,
                    language=language,
                ):
                    yield token

                # Record successful execution trace
                latency_ms = int((time.monotonic() - start_time) * 1000)
                if self._skill_service and trace_steps:
                    await self._skill_service.record_execution(
                        operation_type=operation_type,
                        course_id=course_id,
                        execution_trace=trace_steps,
                        success=True,
                        latency_ms=latency_ms,
                        tokens_used=0,
                        skill_id=skill.id if skill else None,
                    )
                    # Check if we can auto-generate a skill
                    if not skill:
                        await self._skill_service.maybe_generate_skill(
                            operation_type, course_id
                        )
                # Mark skill success independently of trace
                if self._skill_service and skill:
                    await self._skill_service.mark_success(skill.id)

            except Exception:
                # Record failed execution
                if self._skill_service and trace_steps:
                    latency_ms = int((time.monotonic() - start_time) * 1000)
                    await self._skill_service.record_execution(
                        operation_type=operation_type,
                        course_id=course_id,
                        execution_trace=trace_steps,
                        success=False,
                        latency_ms=latency_ms,
                        tokens_used=0,
                        skill_id=skill.id if skill else None,
                    )
                # Mark skill failure independently of trace
                if self._skill_service and skill:
                    await self._skill_service.mark_failure(skill.id)
                raise
        else:
            # Direct context streaming
            async for token in self._ai_engine.stream_question(
                question=question,
                context_text=materials_text,
                history=history,
                language=language,
            ):
                yield token

    async def stream_review(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
        language: str = "en",
    ) -> AsyncGenerator[str, None]:
        """Stream an AI unit review as markdown."""
        await self._check_and_increment_limit(user_id)
        course, materials_text = await self._load_course_materials(course_id)

        async for token in self._ai_engine.stream_review(
            materials_text=materials_text,
            course_name=course.name,
            language=language,
        ):
            yield token

    async def embed_course_materials(self, course_id: uuid.UUID) -> int:
        """Chunk and embed all course text content for RAG retrieval.

        Returns the number of embeddings created.
        """
        settings = get_settings()

        try:
            import voyageai

            from src.models.embedding import ContentEmbedding
        except ImportError:
            logger.warning("embed_skip", reason="voyageai or pgvector not installed")
            return 0

        _, materials_text = await self._load_course_materials(course_id)
        if not materials_text:
            return 0

        # Chunk text
        chunks = _chunk_text(
            materials_text,
            chunk_size=settings.rag_chunk_size,
            overlap=settings.rag_chunk_overlap,
        )

        if not chunks:
            return 0

        # Embed all chunks
        vo = voyageai.Client(api_key=self._voyage_api_key)  # type: ignore[attr-defined]
        embeddings = vo.embed(
            chunks, model="voyage-3", input_type="document"
        ).embeddings

        # Delete existing embeddings for this course
        from sqlalchemy import delete
        await self._session.execute(
            delete(ContentEmbedding).where(ContentEmbedding.course_id == course_id)
        )

        # Insert new embeddings
        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
            self._session.add(
                ContentEmbedding(
                    source_type="mixed",
                    source_id=str(course_id),
                    course_id=course_id,
                    chunk_text=chunk_text,
                    chunk_index=i,
                    embedding=embedding,
                )
            )

        await self._session.flush()
        return len(embeddings)


def _chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks by token count."""
    tokens = _ENCODER.encode(text)
    chunks: list[str] = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunks.append(_ENCODER.decode(chunk_tokens))
        start += chunk_size - overlap
    return chunks
