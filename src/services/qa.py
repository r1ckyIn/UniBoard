"""Course material Q&A service with hybrid direct-context / RAG architecture."""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncGenerator, Sequence
from datetime import UTC, datetime

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
from src.services.skill import _TRACE_OUTPUT_MAX_CHARS, SkillService
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

    async def _bump_qa_access(self, course_id: uuid.UUID) -> None:
        """Bump ``Course.last_qa_access_at`` to fuel the hot-set predicate.

        Phase 34 AIFEAT-02 / D-B1 -- the embedding worker scans courses whose
        ``last_qa_access_at >= now() - 7d``. Concurrent bumps on the same
        course row are acceptable (heuristic column, not a correctness
        boundary), so no ``FOR UPDATE`` lock is needed (RESEARCH §10).

        Called BEFORE the LLM invocation in ``answer_question`` and
        ``stream_answer_question`` so the hot-set window correctly reflects
        user engagement regardless of whether the request ultimately succeeds.
        """
        course = await self._session.get(Course, course_id)
        if course is None:
            return
        course.last_qa_access_at = datetime.now(UTC)
        await self._session.flush()

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
        today = datetime.now(UTC)
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

    async def check_and_increment_limit(self, user_id: uuid.UUID) -> Profile:
        """Public wrapper around ``_check_and_increment_limit``.

        Phase 34 MD-03 fix: routes that perform cost-bearing work (e.g. a
        Voyage embedding call via ``retrieve_rag_sources``) BEFORE entering
        the streaming generator need to gate that work on the AI daily
        limit explicitly. Exposing the check lets the route pre-increment
        the counter and pass ``already_counted=True`` to
        ``stream_answer_question`` to avoid a double increment.
        """
        return await self._check_and_increment_limit(user_id)

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
        language: str = "en",
    ) -> QAResponse:
        """Answer a question about course materials.

        Uses direct context for small courses (< rag_token_threshold tokens),
        auto-switches to RAG for large courses.

        Phase 34 MD-01 fix: threads ``language`` through to the underlying
        ``AIEngine.ask_question`` so ZH users get ZH answers on the
        non-streaming ``POST /courses/{id}/qa`` path.
        """
        await self._check_and_increment_limit(user_id)
        await self._bump_qa_access(course_id)  # Phase 34 AIFEAT-02 / D-B1
        settings = get_settings()

        course, materials_text = await self._load_course_materials(course_id)

        # Count tokens to decide path
        total_tokens = len(_ENCODER.encode(materials_text))

        if total_tokens < settings.rag_token_threshold:
            result = await self._answer_direct(question, materials_text, language=language)
        else:
            result = await self._answer_rag(question, course_id, language=language)

        return result

    async def _answer_direct(
        self,
        question: str,
        materials_text: str,
        language: str = "en",
    ) -> QAResponse:
        """Direct context Q&A: send all materials as context."""
        return await self._ai_engine.ask_question(
            question=question,
            context_text=materials_text,
            language=language,
        )

    async def _answer_rag(
        self,
        question: str,
        course_id: uuid.UUID,
        language: str = "en",
    ) -> QAResponse:
        """RAG Q&A: embed question, retrieve similar chunks via pgvector.

        Phase 34 AIFEAT-02: context is formatted with numbered `Sources:` block
        so the LLM can cite with `[N]` markers (matching the updated
        QA_SYSTEM_PROMPT + _CITATION_PATTERN in ai_engine.py).
        """
        settings = get_settings()

        try:
            import voyageai
            from pgvector.sqlalchemy import cosine_distance

            from src.models.embedding import ContentEmbedding

            # Embed the question
            vo = voyageai.AsyncClient(api_key=self._voyage_api_key)  # type: ignore[attr-defined]
            embed_result = await vo.embed(
                [question], model="voyage-3", input_type="query"
            )
            q_embedding = embed_result.embeddings[0]

            # Query similar chunks
            stmt = (
                select(ContentEmbedding)
                .where(ContentEmbedding.course_id == course_id)
                .order_by(cosine_distance(ContentEmbedding.embedding, q_embedding))
                .limit(settings.rag_top_k)
            )
            result = await self._session.execute(stmt)
            chunks = list(result.scalars().all())

            # Build numbered context so the LLM emits `[N]` citations
            sources, context_text = _build_rag_context(chunks)

            qa_result = await self._ai_engine.ask_question(
                question=question,
                context_text=context_text,
                language=language,
            )
            # Override method since we used RAG. Sources are preserved on the
            # QAResponse.citations field already (numeric markers extracted
            # by _CITATION_PATTERN in ai_engine.py); the structured source
            # list is exposed via retrieve_rag_sources for streaming callers.
            _ = sources  # sources consumed by context_text; frontend uses retrieve_rag_sources
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
            return await self._answer_direct(question, materials_text, language=language)

    async def retrieve_rag_sources(
        self,
        course_id: uuid.UUID,
        question: str,
    ) -> list[dict[str, object]] | None:
        """Return structured RAG sources payload for SSE ``sources`` event.

        Phase 34 AIFEAT-02 helper used by the streaming route to pre-build
        the citation map that the frontend renders. Returns ``None`` when
        voyageai is not installed or no chunks are retrieved (fallback to
        no-sources streaming -- frontend hides the Sources panel).

        Each source carries: ``index`` (1-based), ``source_type`` (``module_item``
        or ``lesson``), ``source_id``, ``title`` (looked up from the owning
        ModuleItem/Lesson), ``module_id`` (for module items; ``None`` for
        lessons), ``anchor`` (reserved for future slide/heading deep links),
        ``chunk_index``, ``score`` (cosine similarity in 0-1), and a
        truncated ``excerpt``. Per RESEARCH §5 schema + Phase 34 HI-01 fix.

        Legacy rows with ``source_type="mixed"`` emit ``title=None`` /
        ``module_id=None``; the frontend renders a labelled fallback using
        ``source_type`` + ``chunk_index``.
        """
        settings = get_settings()

        try:
            import voyageai
            from pgvector.sqlalchemy import cosine_distance

            from src.models.embedding import ContentEmbedding
        except ImportError:
            return None

        try:
            vo = voyageai.AsyncClient(api_key=self._voyage_api_key)  # type: ignore[attr-defined]
            embed_result = await vo.embed(
                [question], model="voyage-3", input_type="query"
            )
            q_embedding = embed_result.embeddings[0]

            # Use cosine_distance expression; also pull the distance value so
            # we can convert to a similarity score in [0, 1].
            distance_expr = cosine_distance(
                ContentEmbedding.embedding, q_embedding
            )
            stmt = (
                select(ContentEmbedding, distance_expr.label("distance"))
                .where(ContentEmbedding.course_id == course_id)
                .order_by(distance_expr)
                .limit(settings.rag_top_k)
            )
            result = await self._session.execute(stmt)
            rows = list(result.all())
        except Exception:  # noqa: BLE001
            logger.warning("retrieve_rag_sources_failed", exc_info=True)
            return None

        if not rows:
            return None

        # Phase 34 HI-01 fix: batch-lookup titles for the retrieved chunks so
        # the SSE payload carries the human-readable title + module_id per
        # source instead of leaving the frontend to render empty entries.
        module_item_ids: set[str] = set()
        lesson_ids: set[str] = set()
        for row in rows:
            chunk = row[0]
            if chunk.source_type == "module_item":
                module_item_ids.add(chunk.source_id)
            elif chunk.source_type == "lesson":
                lesson_ids.add(chunk.source_id)

        module_item_lookup: dict[str, tuple[str, str]] = {}
        if module_item_ids:
            from src.models.module import ModuleItem as _ModuleItem

            mi_stmt = select(_ModuleItem).where(
                _ModuleItem.id.in_([uuid.UUID(i) for i in module_item_ids])
            )
            mi_rows = await self._session.execute(mi_stmt)
            for item in mi_rows.scalars():
                module_item_lookup[str(item.id)] = (
                    item.title,
                    str(item.module_id),
                )

        lesson_lookup: dict[str, str] = {}
        if lesson_ids:
            from src.models.lesson import Lesson as _Lesson

            les_stmt = select(_Lesson).where(
                _Lesson.id.in_([uuid.UUID(i) for i in lesson_ids])
            )
            les_rows = await self._session.execute(les_stmt)
            for lesson in les_rows.scalars():
                lesson_lookup[str(lesson.id)] = lesson.title

        sources: list[dict[str, object]] = []
        for idx, row in enumerate(rows):
            chunk = row[0]
            distance = float(row[1] or 0.0)
            # cosine_distance returns [0, 2]; similarity in [0, 1] = 1 - d/2
            score = max(0.0, min(1.0, 1.0 - distance / 2.0))
            text = chunk.chunk_text or ""
            excerpt = text[:100] + ("..." if len(text) > 100 else "")

            title: str | None = None
            module_id: str | None = None
            if chunk.source_type == "module_item":
                info = module_item_lookup.get(chunk.source_id)
                if info is not None:
                    title, module_id = info
            elif chunk.source_type == "lesson":
                title = lesson_lookup.get(chunk.source_id)

            sources.append(
                {
                    "index": idx + 1,  # 1-based for [N] markers
                    "source_type": chunk.source_type,
                    "source_id": chunk.source_id,
                    "title": title,
                    "module_id": module_id,
                    "anchor": None,  # reserved for future slide/heading deep links
                    "chunk_index": chunk.chunk_index,
                    "score": score,
                    "excerpt": excerpt,
                }
            )
        return sources

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
        already_counted: bool = False,
    ) -> AsyncGenerator[str, None]:
        """Stream Q&A answer. Uses direct context or MCP fallback.

        MCP fallback triggers when:
        (a) DB context token count < MCP_FALLBACK_TOKEN_THRESHOLD
        (b) search_more=True (user clicked "Search More")

        Phase 34 AIFEAT-02 / D-B1: ``_bump_qa_access`` is invoked BEFORE the
        LLM call to fuel the hot-set predicate used by the embedding worker.

        Phase 34 MD-03 fix: ``already_counted=True`` suppresses the internal
        daily-limit check when the route has already incremented the counter
        BEFORE the (cost-bearing) sources prefetch. This prevents a double
        increment per request while preserving the check for callers that
        drive the service directly (tests, other routes).
        """
        if not already_counted:
            await self._check_and_increment_limit(user_id)
        await self._bump_qa_access(course_id)  # Phase 34 AIFEAT-02 / D-B1

        course, materials_text = await self._load_course_materials(course_id)
        total_tokens = len(_ENCODER.encode(materials_text))

        use_agent = search_more or total_tokens < MCP_FALLBACK_TOKEN_THRESHOLD

        if use_agent:
            # MCP agent fallback: use tool_use loop with adapter-backed tools
            from src.services.ai_engine import AGENT_TOOLS

            skill = None
            operation_type = "qa_agent"
            if self._skill_service:
                skill = await self._skill_service.get_skill(operation_type, course_id)

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
                    "output": result[:_TRACE_OUTPUT_MAX_CHARS],
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

        Phase 34 HI-01 fix: chunk + embed per source entity (module_item or
        lesson) so each ContentEmbedding row carries a real ``source_type``
        (``"module_item"`` | ``"lesson"``) plus the owning entity's UUID as
        ``source_id``. This lets ``retrieve_rag_sources`` join back to the
        title/module_id and the frontend Sources panel render non-empty
        entries. Previously every chunk was stored as ``source_type="mixed"``
        with ``source_id=str(course_id)`` (contract drift vs the frontend
        ``CitationSource`` interface).

        Returns the number of embeddings created.
        """
        settings = get_settings()

        try:
            import voyageai

            from src.models.embedding import ContentEmbedding
        except ImportError:
            logger.warning("embed_skip", reason="voyageai or pgvector not installed")
            return 0

        # Load course with its sources so each chunk can be attributed to the
        # owning module_item or lesson.
        stmt = (
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules).selectinload(Module.items),
                selectinload(Course.lessons),
            )
        )
        course_result = await self._session.execute(stmt)
        course = course_result.scalar_one_or_none()
        if course is None:
            return 0

        # Build per-source chunk list: each entry knows its owning entity's
        # identifiers so we can round-trip title lookups on retrieval.
        per_source_chunks: list[tuple[str, str, str]] = []  # (source_type, source_id, chunk_text)

        for module in course.modules:
            for item in module.items:
                text = getattr(item, "text_content", None) or ""
                if not text:
                    continue
                item_chunks = _chunk_text(
                    text,
                    chunk_size=settings.rag_chunk_size,
                    overlap=settings.rag_chunk_overlap,
                )
                for chunk_text in item_chunks:
                    per_source_chunks.append(
                        ("module_item", str(item.id), chunk_text)
                    )

        for lesson in course.lessons:
            text = lesson.text_content or ""
            if not text:
                continue
            lesson_chunks = _chunk_text(
                text,
                chunk_size=settings.rag_chunk_size,
                overlap=settings.rag_chunk_overlap,
            )
            for chunk_text in lesson_chunks:
                per_source_chunks.append(
                    ("lesson", str(lesson.id), chunk_text)
                )

        if not per_source_chunks:
            return 0

        # Embed all chunks in one Voyage call (cost efficient; identical to
        # the pre-fix batching behaviour).
        chunk_texts = [c[2] for c in per_source_chunks]
        vo = voyageai.AsyncClient(api_key=self._voyage_api_key)  # type: ignore[attr-defined]
        result = await vo.embed(
            chunk_texts, model="voyage-3", input_type="document"
        )
        embeddings = result.embeddings

        # Delete existing embeddings for this course (full refresh).
        from sqlalchemy import delete
        await self._session.execute(
            delete(ContentEmbedding).where(ContentEmbedding.course_id == course_id)
        )

        # Insert new embeddings carrying real source_type + source_id.
        for i, ((source_type, source_id, chunk_text), embedding) in enumerate(
            zip(per_source_chunks, embeddings, strict=True)
        ):
            self._session.add(
                ContentEmbedding(
                    source_type=source_type,
                    source_id=source_id,
                    course_id=course_id,
                    chunk_text=chunk_text,
                    chunk_index=i,
                    embedding=embedding,
                )
            )

        await self._session.flush()
        return len(embeddings)


def _build_rag_context(
    chunks: Sequence[object],
) -> tuple[list[dict[str, object]], str]:
    """Assemble a numbered ``Sources:`` block for the LLM context window.

    Phase 34 AIFEAT-02: the prompt instructs numeric ``[N]`` citations; this
    helper prefixes each retrieved chunk with ``[1]``, ``[2]`` etc. so the
    LLM can cite consistently. Returns ``(sources_payload, context_text)``
    where ``sources_payload`` is the structured list suitable for the
    ``sources`` SSE event (though the streaming path builds its own via
    ``QAService.retrieve_rag_sources``; this helper is used by
    ``_answer_rag`` for the non-streaming path).
    """
    sources_payload: list[dict[str, object]] = []
    lines: list[str] = ["Sources:"]
    for idx, chunk in enumerate(chunks):
        source_type = getattr(chunk, "source_type", "unknown")
        chunk_text = getattr(chunk, "chunk_text", "") or ""
        chunk_index = getattr(chunk, "chunk_index", 0)
        source_id = getattr(chunk, "source_id", "")
        index = idx + 1
        lines.append(f"[{index}] ({source_type} chunk {chunk_index}) {chunk_text}")
        excerpt = chunk_text[:100] + ("..." if len(chunk_text) > 100 else "")
        sources_payload.append(
            {
                "index": index,
                "source_type": source_type,
                "source_id": source_id,
                "chunk_index": chunk_index,
                "excerpt": excerpt,
            }
        )
    return sources_payload, "\n\n".join(lines)


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
