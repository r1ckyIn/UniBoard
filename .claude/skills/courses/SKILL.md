# Course-Specific Skills

Skills for handling per-course differentiation patterns in data collection and AI analysis.

> **PLAT-03 (MCP server for Claude Desktop) is DEFERRED to v1.1+.** The skill system here serves development tooling, not runtime MCP operations. Students access UniBoard via Web Dashboard and email notifications only.

## Rule 1: Ed Structure Variance
Different courses use Ed Discussion categories differently. Some use "General", "Assignment", "Exam". Others use custom categories. AI thread evaluation must handle arbitrary category strings — never hardcode expected categories.

## Rule 2: Canvas Module Organization
Some courses organize modules by week ("Week 1", "Week 2"), others by topic ("Sorting", "Graphs"). The `Module.position` field provides ordering. AI review summaries should respect the module structure, not assume weekly organization.

## Rule 3: Weight Source Hierarchy
Assessment weights come from multiple sources with priority:
1. Unit Outline HTML (USYD official website) — primary, most reliable
2. Canvas `assignment_groups` API — fallback if HTML unavailable
3. Manual entry — last resort

Weight-sum validation: total must be 95%-105% to be accepted. Outside this range, reject and fallback.
Source: `src/parsers/unit_outline.py`, `src/services/gpa.py`

## Rule 4: Course Linking
Courses linked across platforms via `(course_code, semester)` composite key. Course code extracted from Canvas course name via regex. Ed courses matched by similar extraction. This is the primary join key.
Source: `src/services/course_linking.py`

## Rule 5: AI Quality Variance
STEM courses (COMP, INFO, MATH) tend to have more structured Ed posts — AI thread evaluation works well (higher F1). Humanities courses have more free-form discussion — may need lower `gpa_relevance` threshold or heavier reliance on rule-based filtering.

## Course Documentation Template

When documenting a new course's patterns, use this template:

```markdown
## {COURSE_CODE}: {Course Name}

### Ed Discussion
- Categories used: [list]
- Staff posting frequency: [high/medium/low]
- Endorsement rate: [percentage]

### Canvas
- Module structure: [weekly/topic/mixed]
- Assessment naming: [pattern]

### AI Performance
- Thread eval F1: [score]
- Q&A method: [direct/RAG]
- Known issues: [any]
```
