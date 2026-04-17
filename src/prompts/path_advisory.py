"""Path planner advisory prompt (EN + ZH bilingual, 30-50 words).

Phase 34 D-C4 format: [Verdict] + [Required avg] + [Concrete tactic
referencing high-weight remaining unit type]. Targets 30-50 words
(not 20-30 -- different from study rec / digest).
"""

from __future__ import annotations

PATH_ADVISORY_SYSTEM_PROMPT = (
    "You are UniBoard's GPA path advisor. Given a math result for required "
    "average across remaining credit points to reach a target WAM, produce a "
    "30-50 word actionable verdict in this exact format:\n"
    "[Verdict: Reachable / Tight / Not reachable] + [Required avg or "
    "suggested target] + [Concrete tactic referencing high-weight remaining "
    "unit type].\n"
    "Examples:\n"
    " - Achievable: 'Reachable -- remaining 8 units need avg 78. Advanced "
    "units carry the heaviest weight; prioritize the 3000-level capstone "
    "group project.'\n"
    " - Unreachable: 'HD (85) is no longer reachable, but Distinction (75) "
    "is. Aim for 72 average across remaining 8 units; focus on capstone "
    "weight (50%).'\n"
    "Be precise -- no generic encouragement. Cite the specific number from "
    "the math."
)

PATH_ADVISORY_SYSTEM_PROMPT_ZH = (
    "你是 UniBoard 的 GPA 路径规划顾问。根据'剩余学分需要平均多少分才能达到"
    "目标 WAM'的数学结果，生成 30-50 字的行动建议，严格遵守格式：\n"
    "[判定：可达 / 勉强 / 不可达] + [所需平均分或建议目标] + "
    "[具体战术，引用剩余高权重课程类型]。\n"
    "示例：\n"
    " - 可达：'可达 — 剩余 8 门平均需 78。Advanced units 权重最大，"
    "优先抓 3000-level capstone 的 group project。'\n"
    " - 不可达：'HD (85) 已不可达，但 Distinction (75) 还有空间。"
    "剩余 8 门平均 72；重点冲 capstone 权重 (50%)。'\n"
    "精确具体，引用数学结果中的具体数字，不要笼统鼓励话。"
)


def get_path_advisory_prompt(language: str = "en") -> str:
    """Select path advisory system prompt by language preference."""
    if language == "zh":
        return PATH_ADVISORY_SYSTEM_PROMPT_ZH
    return PATH_ADVISORY_SYSTEM_PROMPT


def get_path_advisory_user_message(
    *,
    is_achievable: bool,
    required_avg: float | None,
    max_reachable: float,
    suggested_target: float | None,
    course_levels: list[int] | None = None,
    language: str = "en",
) -> str:
    """Build user message for path advisory inference.

    Formats the math result into a structured prompt for the LLM.
    course_levels is an optional hint (e.g., [3000, 2000]) so the AI
    can reference unit types accurately. None = generic phrasing.
    """
    if language == "zh":
        parts = [f"判定：{'可达' if is_achievable else '不可达'}"]
        if required_avg is not None:
            parts.append(f"剩余学分需平均：{required_avg:.1f}")
        else:
            parts.append("无剩余学分（已完成）")
        parts.append(f"理论最高可达 WAM：{max_reachable:.1f}")
        if suggested_target is not None:
            parts.append(f"建议下移目标至：{suggested_target:.0f}")
        if course_levels:
            parts.append(f"剩余课程级别：{course_levels}")
        parts.append("请生成 30-50 字行动建议。")
    else:
        parts = [
            f"Verdict: {'Reachable' if is_achievable else 'Not reachable'}"
        ]
        if required_avg is not None:
            parts.append(f"Required avg over remaining credits: {required_avg:.1f}")
        else:
            parts.append("Zero remaining credits (already complete)")
        parts.append(f"Max reachable WAM: {max_reachable:.1f}")
        if suggested_target is not None:
            parts.append(f"Suggested target downgrade: {suggested_target:.0f}")
        if course_levels:
            parts.append(f"Remaining course levels: {course_levels}")
        parts.append("Generate the 30-50 word advisory now.")
    return "\n".join(parts)
