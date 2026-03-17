# Thread Evaluation Rules

Rules for AI-based Ed Discussion thread scoring and GPA relevance analysis.

## Rule 1: Model Selection
Use `claude-sonnet-4-20250514` for routine thread scoring — fast and cost-effective. Opus is overkill for binary relevance classification.

## Rule 2: Evaluation Schema
ThreadEvaluation Pydantic model: `gpa_relevance` (0.0-1.0), `category` (enum: exam_info, assignment_clarification, rubric, deadline_change, common_mistake, endorsed_answer, irrelevant), `summary` (str), `urgency` (critical/important/informational), `key_facts` (list[str]).

## Rule 3: Incremental Evaluation
Only evaluate threads where `gpa_relevance_score == 0.0` (unscored). Already-scored threads are skipped. This prevents re-evaluating the entire corpus on every sync.

## Rule 4: Score Persistence
Store AI result directly in `DiscussionThread.gpa_relevance_score` column. This avoids a separate scoring table and enables efficient queries (filter `WHERE gpa_relevance_score > 0.3`).

## Rule 5: Fallback on AI Failure
If `evaluate_thread()` raises, the thread stays at `gpa_relevance_score = 0.0`. Rule-based filtering (`is_endorsed` + `is_staff_post`) still surfaces it if relevant. AI failure is silent — never blocks the user.
Source: `src/services/intelligence.py`, `src/services/ai_engine.py`
