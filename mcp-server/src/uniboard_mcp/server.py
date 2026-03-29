"""UniBoard MCP Server — 17 tools for Canvas, Ed Discussion, Ed Lessons, Unit Outline."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
import structlog
from mcp.server.fastmcp import FastMCP

try:
    from mcp.server.fastmcp import ToolError
except ImportError:
    # Fallback for older MCP SDK versions
    ToolError = ValueError  # type: ignore[misc, assignment]

from uniboard_mcp.adapters.canvas import CanvasAdapter
from uniboard_mcp.adapters.ed_discussion import EdDiscussionAdapter
from uniboard_mcp.adapters.ed_lessons import EdLessonsAdapter
from uniboard_mcp.errors import TokenInvalidError, UpstreamUnavailableError
from uniboard_mcp.parsers.unit_outline import UnitOutlineParser

logger = structlog.get_logger()


@dataclass
class AppContext:
    """Shared application state across all tools."""

    canvas: CanvasAdapter | None
    ed_discussion: EdDiscussionAdapter | None
    ed_lessons: EdLessonsAdapter | None
    parser: UnitOutlineParser
    http_client: httpx.AsyncClient


@asynccontextmanager
async def lifespan(server: FastMCP) -> AsyncGenerator[AppContext, None]:
    """Initialize adapters from environment variables, share HTTP client."""
    http_client = httpx.AsyncClient(timeout=30.0)

    canvas_token = os.environ.get("CANVAS_API_TOKEN")
    canvas_url = os.environ.get("CANVAS_BASE_URL", "https://canvas.sydney.edu.au/api/v1")
    ed_token = os.environ.get("ED_API_TOKEN")

    canvas = None
    ed_discussion = None
    ed_lessons = None

    if canvas_token:
        canvas = CanvasAdapter(canvas_token, canvas_url, http_client=http_client)
        logger.info("canvas_adapter_initialized", base_url=canvas_url)
    else:
        logger.warning("canvas_not_configured", hint="Set CANVAS_API_TOKEN env var")

    if ed_token:
        ed_discussion = EdDiscussionAdapter(ed_token, http_client=http_client)
        ed_lessons = EdLessonsAdapter(ed_token, http_client=http_client)
        logger.info("ed_adapters_initialized")
    else:
        logger.warning("ed_not_configured", hint="Set ED_API_TOKEN env var")

    parser = UnitOutlineParser()

    try:
        yield AppContext(
            canvas=canvas,
            ed_discussion=ed_discussion,
            ed_lessons=ed_lessons,
            parser=parser,
            http_client=http_client,
        )
    finally:
        await http_client.aclose()


mcp = FastMCP("uniboard-mcp", lifespan=lifespan)


# --- Response formatters ---


def format_courses(courses: list[dict]) -> str:
    """Format course list as human-readable text."""
    if not courses:
        return "No active courses found."
    lines = [f"Found {len(courses)} active courses:\n"]
    for c in courses:
        name = c.get("name", "Unknown")
        cid = c.get("id", "?")
        code = c.get("course_code", "")
        line = f"- {name} (ID: {cid})"
        if code:
            line += f" [{code}]"
        lines.append(line)
    return "\n".join(lines)


def format_grades(grades: list[dict], course_id: str) -> str:
    """Format grade/enrollment data as human-readable text."""
    if not grades:
        return f"No grade data found for course {course_id}."
    lines = [f"Grades for course {course_id}:\n"]
    for g in grades:
        grades_data = g.get("grades", {})
        if isinstance(grades_data, dict):
            score = grades_data.get("current_score", "N/A")
            grade = grades_data.get("current_grade", "N/A")
            lines.append(f"- Current Score: {score}, Grade: {grade}")
        else:
            lines.append(f"- Enrollment type: {g.get('type', 'unknown')}")
    return "\n".join(lines)


def format_assignments(assignments: list[dict], course_id: str) -> str:
    """Format assignment list as human-readable text."""
    if not assignments:
        return f"No assignments found for course {course_id}."
    lines = [f"Found {len(assignments)} assignments for course {course_id}:\n"]
    for a in assignments:
        name = a.get("name", "Unknown")
        due = a.get("due_at", "No due date")
        points = a.get("points_possible", "?")
        lines.append(f"- {name} (Due: {due}, Points: {points})")
    return "\n".join(lines)


def format_modules(modules: list[dict], course_id: str) -> str:
    """Format module tree as human-readable text."""
    if not modules:
        return f"No modules found for course {course_id}."
    lines = [f"Found {len(modules)} modules for course {course_id}:\n"]
    for m in modules:
        name = m.get("name", "Unknown")
        items = m.get("items", [])
        lines.append(f"## {name}")
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    title = item.get("title", "Unknown")
                    item_type = item.get("type", "")
                    lines.append(f"  - [{item_type}] {title}")
        lines.append("")
    return "\n".join(lines)


def format_announcements(announcements: list[dict], course_id: str) -> str:
    """Format announcements as human-readable text."""
    if not announcements:
        return f"No announcements found for course {course_id}."
    lines = [f"Found {len(announcements)} announcements for course {course_id}:\n"]
    for a in announcements:
        title = a.get("title", "Unknown")
        posted = a.get("posted_at", "Unknown date")
        message = a.get("message", "")
        # Strip HTML tags for readability
        if "<" in message:
            from html import unescape
            import re
            message = re.sub(r"<[^>]+>", "", unescape(message))
        preview = message[:200] + "..." if len(message) > 200 else message
        lines.append(f"### {title}")
        lines.append(f"Posted: {posted}")
        lines.append(preview)
        lines.append("")
    return "\n".join(lines)


def format_files(files: list[dict], course_id: str) -> str:
    """Format file list as human-readable text."""
    if not files:
        return f"No files found for course {course_id}."
    lines = [f"Found {len(files)} files for course {course_id}:\n"]
    for f in files:
        name = f.get("display_name", f.get("filename", "Unknown"))
        size = f.get("size", 0)
        size_str = f"{size / 1024:.1f} KB" if size else "Unknown size"
        url = f.get("url", "")
        lines.append(f"- {name} ({size_str})")
        if url:
            lines.append(f"  Download: {url}")
    return "\n".join(lines)


def format_tabs(tabs: list[dict], course_id: str) -> str:
    """Format tab list as human-readable text."""
    if not tabs:
        return f"No navigation tabs found for course {course_id}."
    lines = [f"Navigation tabs for course {course_id}:\n"]
    for t in tabs:
        label = t.get("label", "Unknown")
        url = t.get("full_url", t.get("html_url", ""))
        hidden = " (hidden)" if t.get("hidden", False) else ""
        lines.append(f"- {label}{hidden}: {url}")
    return "\n".join(lines)


def format_assignment_groups(groups: list[dict], course_id: str) -> str:
    """Format assignment groups with weights as human-readable text."""
    if not groups:
        return f"No assignment groups found for course {course_id}."
    lines = [f"Assignment groups for course {course_id}:\n"]
    for g in groups:
        name = g.get("name", "Unknown")
        weight = g.get("group_weight", 0)
        lines.append(f"- {name}: {weight}%")
    return "\n".join(lines)


def format_threads(threads: list[dict], course_id: str) -> str:
    """Format Ed Discussion threads as human-readable text."""
    if not threads:
        return f"No threads found for course {course_id}."
    lines = [f"Found {len(threads)} threads:\n"]
    for t in threads:
        title = t.get("title", "Unknown")
        endorsed = " [ENDORSED]" if t.get("is_endorsed") else ""
        staff = " [STAFF ANSWERED]" if t.get("is_staff_answered") else ""
        votes = t.get("vote_count", 0)
        lines.append(f"- {title}{endorsed}{staff} ({votes} votes)")
    return "\n".join(lines)


def format_thread_detail(thread: dict) -> str:
    """Format a single Ed thread with content."""
    if not thread:
        return "Thread not found."
    title = thread.get("title", "Unknown")
    content = thread.get("content", "No content")
    endorsed = "Yes" if thread.get("is_endorsed") else "No"
    staff_answered = "Yes" if thread.get("is_staff_answered") else "No"
    votes = thread.get("vote_count", 0)
    created = thread.get("created_at", "Unknown")

    return (
        f"# {title}\n\n"
        f"Endorsed: {endorsed} | Staff Answered: {staff_answered} | Votes: {votes}\n"
        f"Created: {created}\n\n"
        f"{content}"
    )


def format_lessons(
    lessons: list[dict], modules: list[dict], course_id: str
) -> str:
    """Format Ed Lessons list as human-readable text."""
    if not lessons:
        return f"No lessons found for course {course_id}."
    module_map = {m["id"]: m.get("name", "Unknown") for m in modules}
    lines = [f"Found {len(lessons)} lessons for course {course_id}:\n"]

    current_module = None
    for lesson in lessons:
        mod_id = lesson.get("module_id")
        mod_name = module_map.get(mod_id, "Unassigned") if mod_id else "Unassigned"
        if mod_name != current_module:
            current_module = mod_name
            lines.append(f"\n## {mod_name}")
        title = lesson.get("title", "Unknown")
        slides = lesson.get("slide_count", 0)
        kind = lesson.get("kind", "")
        due = lesson.get("due_at", "")
        due_str = f" (Due: {due})" if due else ""
        lines.append(f"  - {title} [{kind}] ({slides} slides){due_str}")

    return "\n".join(lines)


def format_lesson_detail(lesson: dict) -> str:
    """Format a single Ed lesson with slides."""
    if not lesson:
        return "Lesson not found."
    title = lesson.get("title", "Unknown")
    kind = lesson.get("kind", "")
    slides = lesson.get("slides", [])

    lines = [f"# {title} [{kind}]\n"]
    for slide in slides:
        if isinstance(slide, dict):
            slide_title = slide.get("title", "")
            content = slide.get("content", "")
            if slide_title:
                lines.append(f"## {slide_title}")
            if content:
                lines.append(content[:500])
            lines.append("")

    return "\n".join(lines)


def format_outline(result: "UnitOutlineParseResult") -> str:
    """Format parsed Unit Outline as human-readable text."""
    from uniboard_mcp.parsers.unit_outline import UnitOutlineParseResult

    if not isinstance(result, UnitOutlineParseResult):
        return "Failed to parse unit outline."

    lines = []
    if result.course_description:
        lines.append(f"## Description\n{result.course_description}\n")

    if result.learning_outcomes:
        lines.append("## Learning Outcomes")
        for i, outcome in enumerate(result.learning_outcomes, 1):
            lines.append(f"  {i}. {outcome}")
        lines.append("")

    if result.assessments:
        lines.append("## Assessments")
        total_weight = 0.0
        for a in result.assessments:
            w_pct = f"{a.weight * 100:.0f}%"
            total_weight += a.weight
            lines.append(f"- **{a.name}** ({w_pct})")
            if a.due_date:
                lines.append(f"  Due: {a.due_date}")
            if a.description:
                lines.append(f"  {a.description[:150]}")
            if a.ai_policy:
                lines.append(f"  AI Policy: {a.ai_policy}")
        lines.append(f"\nTotal weight: {total_weight * 100:.0f}%")
    else:
        lines.append("No assessment items found in the page.")

    return "\n".join(lines)


# --- Canvas tools (9) ---


@mcp.tool()
async def get_canvas_courses(ctx) -> str:
    """List all active Canvas LMS courses with IDs and course codes."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_courses()
        return format_courses(data)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_grades(course_id: str, ctx) -> str:
    """Get grades and enrollment data for a Canvas course."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_grades(course_id)
        return format_grades(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_assignments(course_id: str, ctx) -> str:
    """List all assignments for a Canvas course with due dates and points."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_assignments(course_id)
        return format_assignments(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_modules(course_id: str, ctx) -> str:
    """Get module tree with items for a Canvas course."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_modules(course_id)
        return format_modules(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_announcements(course_id: str, ctx) -> str:
    """List announcements for a Canvas course with content previews."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_announcements(course_id)
        return format_announcements(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_files(course_id: str, search: str = "", ctx=None) -> str:
    """List files in a Canvas course, optionally filtered by search term."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_files(course_id, search)
        return format_files(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_tabs(course_id: str, ctx) -> str:
    """Get navigation tabs for a Canvas course."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_tabs(course_id)
        return format_tabs(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_canvas_assignment_groups(course_id: str, ctx) -> str:
    """Get assignment groups with weight percentages for a Canvas course."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    try:
        data = await app.canvas.get_assignment_groups(course_id)
        return format_assignment_groups(data, course_id)
    except TokenInvalidError:
        raise ToolError("Canvas token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Canvas API temporarily unavailable. Try again later.")


@mcp.tool()
async def validate_canvas_token(ctx) -> str:
    """Check if the configured Canvas API token is valid."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.canvas:
        raise ToolError("Canvas not configured. Set CANVAS_API_TOKEN env var.")
    valid = await app.canvas.validate_token()
    return "Canvas token is valid." if valid else "Canvas token is INVALID or expired."


# --- Ed Discussion tools (3) ---


@mcp.tool()
async def get_ed_threads(
    course_id: str,
    filter: str = "",
    sort: str = "new",
    limit: int = 20,
    ctx=None,
) -> str:
    """List Ed Discussion threads for a course. Filter: endorsed, staff_answered. Sort: new, old, top."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.ed_discussion:
        raise ToolError("Ed Discussion not configured. Set ED_API_TOKEN env var.")
    try:
        data = await app.ed_discussion.get_threads(
            course_id,
            filter=filter or None,
            sort=sort,
            limit=limit,
        )
        return format_threads(data, course_id)
    except TokenInvalidError:
        raise ToolError("Ed Discussion token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Ed Discussion API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_ed_thread(thread_id: str, ctx) -> str:
    """Get a single Ed Discussion thread with full content."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.ed_discussion:
        raise ToolError("Ed Discussion not configured. Set ED_API_TOKEN env var.")
    try:
        data = await app.ed_discussion.get_thread(thread_id)
        return format_thread_detail(data)
    except TokenInvalidError:
        raise ToolError("Ed Discussion token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Ed Discussion API temporarily unavailable. Try again later.")


@mcp.tool()
async def search_ed_threads(course_id: str, query: str, ctx) -> str:
    """Search Ed Discussion threads by keyword."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.ed_discussion:
        raise ToolError("Ed Discussion not configured. Set ED_API_TOKEN env var.")
    try:
        data = await app.ed_discussion.search_threads(course_id, query)
        return format_threads(data, course_id)
    except TokenInvalidError:
        raise ToolError("Ed Discussion token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Ed Discussion API temporarily unavailable. Try again later.")


# --- Ed Lessons tools (3) ---


@mcp.tool()
async def get_ed_lessons(course_id: str, ctx) -> str:
    """List Ed Lessons for a course, grouped by module."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.ed_lessons:
        raise ToolError("Ed Lessons not configured. Set ED_API_TOKEN env var.")
    try:
        lessons, modules = await app.ed_lessons.get_lessons(course_id)
        return format_lessons(lessons, modules, course_id)
    except TokenInvalidError:
        raise ToolError("Ed Lessons token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Ed Lessons API temporarily unavailable. Try again later.")


@mcp.tool()
async def get_ed_lesson(lesson_id: str, ctx) -> str:
    """Get a single Ed Lesson with slide content."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.ed_lessons:
        raise ToolError("Ed Lessons not configured. Set ED_API_TOKEN env var.")
    try:
        data = await app.ed_lessons.get_lesson(lesson_id)
        return format_lesson_detail(data)
    except TokenInvalidError:
        raise ToolError("Ed Lessons token is invalid or expired.")
    except UpstreamUnavailableError:
        raise ToolError("Ed Lessons API temporarily unavailable. Try again later.")


@mcp.tool()
async def validate_ed_token(ctx) -> str:
    """Check if the configured Ed API token is valid."""
    app: AppContext = ctx.request_context.lifespan_context
    if not app.ed_lessons:
        raise ToolError("Ed not configured. Set ED_API_TOKEN env var.")
    valid = await app.ed_lessons.validate_token()
    return "Ed API token is valid." if valid else "Ed API token is INVALID or expired."


# --- Unit Outline tools (2) ---


@mcp.tool()
async def parse_unit_outline(url: str, ctx) -> str:
    """Parse a USYD Unit Outline page and extract assessments, weights, learning outcomes."""
    app: AppContext = ctx.request_context.lifespan_context
    try:
        result = await app.parser.fetch_and_parse(url)
        return format_outline(result)
    except httpx.HTTPStatusError as exc:
        raise ToolError(f"Failed to fetch unit outline: HTTP {exc.response.status_code}")
    except Exception as exc:
        raise ToolError(f"Failed to parse unit outline: {exc}")


@mcp.tool()
async def validate_outline_weights(url: str, ctx) -> str:
    """Fetch a USYD Unit Outline and check if assessment weights sum to ~100%."""
    app: AppContext = ctx.request_context.lifespan_context
    try:
        result = await app.parser.fetch_and_parse(url)
        valid = app.parser.validate_weights(result.assessments)
        total = sum(a.weight for a in result.assessments) * 100
        if valid:
            return f"Assessment weights are valid. Total: {total:.0f}% (within 95-105% range)."
        return f"Assessment weights may be incorrect. Total: {total:.0f}% (expected 95-105%)."
    except Exception as exc:
        raise ToolError(f"Failed to validate outline weights: {exc}")


def main() -> None:
    """Entry point for the MCP server."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
