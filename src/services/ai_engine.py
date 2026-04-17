"""AIEngine wrapping Anthropic AsyncAnthropic with structured output parsing."""

from __future__ import annotations

import json
import re
from collections.abc import AsyncGenerator, Awaitable, Callable

import structlog
from anthropic import AsyncAnthropic

from src.prompts.qa import get_qa_prompt
from src.prompts.review import REVIEW_SYSTEM_PROMPT, get_review_prompt
from src.prompts.risk_analysis import GPA_RISK_ANALYSIS_SYSTEM_PROMPT
from src.prompts.thread_eval import THREAD_EVAL_SYSTEM_PROMPT
from src.schemas.ai import QAResponse, ThreadEvaluation, UnitReviewResponse

logger = structlog.get_logger()

# Phase 34 AIFEAT-02: switch from `[Canvas: name]` / `[Ed: lesson]` text markers
# to numeric `[N]` markers matching the 1-based order of sources in the
# `Sources:` context block. The new regex captures the index as group 1 so the
# frontend can correlate marker -> sources[N-1] via a map.
_CITATION_PATTERN = re.compile(r"\[(\d+)\]")

# Tool definitions for adapter-backed cross-platform research (MCP fallback)
AGENT_TOOLS: list[dict[str, object]] = [
    {
        "name": "search_canvas_modules",
        "description": (
            "Search Canvas course modules and announcements for relevant content"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for Canvas content",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_ed_threads",
        "description": (
            "Search Ed Discussion threads for assignment clarifications, "
            "endorsed answers, or staff posts"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for Ed Discussion",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_ed_lesson_content",
        "description": (
            "Get content from a specific Ed Lessons lesson or assignment"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {
                    "type": "integer",
                    "description": "Ed Lesson ID",
                },
            },
            "required": ["lesson_id"],
        },
    },
]


class AIEngine:
    """Unified AI engine wrapping Anthropic SDK for all AI features.

    Uses claude-sonnet-4-20250514 for routine tasks (thread eval, urgency scoring)
    and claude-opus-4-6 for deep analysis (Q&A, review, GPA risk).
    """

    def __init__(
        self,
        api_key: str,
        model: str = "claude-sonnet-4-20250514",
    ) -> None:
        self._client = AsyncAnthropic(api_key=api_key)
        self._default_model = model

    async def evaluate_thread(
        self,
        title: str,
        content: str,
        category: str,
        is_endorsed: bool,
        is_staff_post: bool,
    ) -> ThreadEvaluation:
        """Evaluate an Ed Discussion thread for GPA relevance.

        Uses sonnet for routine classification. Raises ValueError on invalid JSON.
        """
        user_message = (
            f"Title: {title}\n"
            f"Category: {category}\n"
            f"Endorsed: {is_endorsed}\n"
            f"Staff post: {is_staff_post}\n"
            f"Content: {content}"
        )

        response = await self._client.messages.create(
            model=self._default_model,
            max_tokens=500,
            system=THREAD_EVAL_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text: str = response.content[0].text  # type: ignore[union-attr]

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"AI returned invalid JSON: {raw_text[:200]}") from exc

        return ThreadEvaluation(**data)

    async def ask_question(
        self,
        question: str,
        context_text: str,
        model: str = "claude-opus-4-6",
        language: str = "en",
    ) -> QAResponse:
        """Answer a student question using provided course material context.

        Uses opus for high-quality Q&A. Extracts inline citations from response.

        Phase 34 MD-01 fix: honours user language preference by selecting the
        EN/ZH QA system prompt via ``get_qa_prompt``. Previously the
        non-streaming path was hardcoded to English even for ZH users.
        """
        user_message = (
            f"Course materials:\n{context_text}\n\n"
            f"Student question: {question}"
        )

        response = await self._client.messages.create(
            model=model,
            max_tokens=1000,
            system=get_qa_prompt(language),
            messages=[{"role": "user", "content": user_message}],
        )

        answer_text: str = response.content[0].text  # type: ignore[union-attr]
        citations = _CITATION_PATTERN.findall(answer_text)
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        return QAResponse(
            answer=answer_text,
            citations=citations,
            method="direct_context",
            tokens_used=tokens_used,
        )

    async def generate_review(
        self,
        materials_text: str,
        course_name: str,
        model: str = "claude-opus-4-6",
    ) -> UnitReviewResponse:
        """Generate a structured unit review summary from course materials.

        Uses opus for comprehensive review generation.
        """
        user_message = (
            f"Course: {course_name}\n\n"
            f"Materials:\n{materials_text}"
        )

        response = await self._client.messages.create(
            model=model,
            max_tokens=1500,
            system=REVIEW_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text: str = response.content[0].text  # type: ignore[union-attr]

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            # Attempt to extract JSON from markdown code blocks
            json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(1))
            else:
                raise ValueError(
                    f"AI returned invalid JSON for review: {raw_text[:200]}"
                ) from None

        return UnitReviewResponse(**data)

    async def score_urgency(self, items_json: str) -> list[dict[str, object]]:
        """Batch urgency scoring for digest items using sonnet.

        Returns list of {index, urgency_score, reason}.
        """
        response = await self._client.messages.create(
            model=self._default_model,
            max_tokens=1000,
            system=(
                "Score each item 1-5 for academic urgency. "
                'Return JSON array: [{"index": int, "urgency_score": int, "reason": str}]'
            ),
            messages=[{"role": "user", "content": items_json}],
        )

        raw_text: str = response.content[0].text  # type: ignore[union-attr]
        result: list[dict[str, object]] = json.loads(raw_text)
        return result

    async def analyze_gpa_risk(
        self,
        current_wam: float,
        target_wam: float,
        course_grades_json: str,
    ) -> str:
        """Deep GPA risk analysis using Claude Opus 4.6.

        Consumed by RiskAlertService.check_risk_for_user for AI-powered
        recommendations when WAM gap exceeds threshold.

        Raises on API failure so caller can fall back to rule-based advice.
        """
        user_message = (
            f"Current WAM: {current_wam}, Target: {target_wam}, "
            f"Gap: {target_wam - current_wam}. "
            f"Course grades:\n{course_grades_json}"
        )

        response = await self._client.messages.create(
            model="claude-opus-4-6",
            max_tokens=300,
            system=GPA_RISK_ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        recommendation: str = response.content[0].text  # type: ignore[union-attr]
        return recommendation

    async def stream_question(
        self,
        question: str,
        context_text: str,
        history: list[dict[str, str]] | None = None,
        language: str = "en",
        model: str = "claude-sonnet-4-20250514",
    ) -> AsyncGenerator[str, None]:
        """Stream answer tokens. Yields text deltas."""
        messages: list[dict[str, object]] = []
        if history:
            messages.extend(history)  # type: ignore[arg-type]
        messages.append({
            "role": "user",
            "content": (
                f"Course materials:\n{context_text}\n\n"
                f"Student question: {question}"
            ),
        })

        async with self._client.messages.stream(
            model=model,
            max_tokens=1000,
            system=get_qa_prompt(language),
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for event in stream:
                if event.type == "text":
                    yield event.text

    async def agent_stream(
        self,
        question: str,
        context_text: str,
        tools: list[dict[str, object]],
        tool_executor: Callable[[str, dict[str, object]], Awaitable[str]],
        language: str = "en",
        model: str = "claude-sonnet-4-20250514",
    ) -> AsyncGenerator[str, None]:
        """Agentic streaming loop with tool_use support.

        When Claude calls a tool (stop_reason="tool_use"), executes it via
        tool_executor, sends result back, and resumes streaming.
        """
        messages: list[dict[str, object]] = [
            {
                "role": "user",
                "content": f"Context:\n{context_text}\n\nQuestion: {question}",
            }
        ]

        max_iterations = 5  # Safety limit on tool call loops
        for _ in range(max_iterations):
            async with self._client.messages.stream(
                model=model,
                max_tokens=1000,
                system=get_qa_prompt(language),
                messages=messages,  # type: ignore[arg-type]
                tools=tools,  # type: ignore[arg-type]
            ) as stream:
                async for event in stream:
                    if event.type == "text":
                        yield event.text

                final_message = await stream.get_final_message()

                if final_message.stop_reason == "tool_use":
                    # Append assistant message with tool_use blocks
                    messages.append({
                        "role": "assistant",
                        "content": final_message.content,
                    })

                    # Execute each tool call
                    tool_results: list[dict[str, object]] = []
                    for block in final_message.content:
                        if block.type == "tool_use":
                            result = await tool_executor(block.name, block.input)
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result,
                            })

                    messages.append({"role": "user", "content": tool_results})
                    continue
                else:
                    # stop_reason is "end_turn" -- done
                    break

    async def stream_review(
        self,
        materials_text: str,
        course_name: str,
        language: str = "en",
        model: str = "claude-opus-4-6",
    ) -> AsyncGenerator[str, None]:
        """Stream review as markdown text. Yields text deltas."""
        messages: list[dict[str, object]] = [{
            "role": "user",
            "content": f"Course: {course_name}\n\nMaterials:\n{materials_text}",
        }]

        async with self._client.messages.stream(
            model=model,
            max_tokens=1500,
            system=get_review_prompt(language),
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for event in stream:
                if event.type == "text":
                    yield event.text
