# Q&A Pipeline Rules

Rules for hybrid course material Q&A with direct context and RAG paths.

## Rule 1: Token Counting
Use `tiktoken` with `cl100k_base` encoding to count material tokens. Threshold: 100K tokens (`Settings.rag_token_threshold`). Below threshold → direct context. Above → RAG.

## Rule 2: Direct Context Path
Concatenate all course materials (modules + lessons with `text_content`) into a single context string with source labels. Call `AIEngine.ask_question(question, context_text)`. Fast, no embedding overhead. Works well for small courses.

## Rule 3: RAG Pipeline
For large courses (>100K tokens): embed question via Voyage AI `voyage-3` (1024-dim). Query `ContentEmbedding` table via `cosine_distance` (pgvector), limit `rag_top_k=15`. Concatenate retrieved chunks with source labels. Call `AIEngine.ask_question`.
- Chunk size: 512 tokens, overlap: 50
- Docker image: `ankane/pgvector` for PostgreSQL with vector extension

## Rule 4: Citation Format
Inline citations: `[Canvas: {source_name}]` or `[Ed: {lesson_title}]`. Extracted from AI response via regex `\[(?:Canvas|Ed): [^\]]+\]`. Prompt explicitly instructs "Never fabricate citations."
Source: `src/prompts/qa.py`

## Rule 5: Model Selection
Use `claude-opus-4-6` for Q&A (per locked user decision). Opus provides higher quality answers and more accurate citation extraction than Sonnet.

## Rule 6: Rate Limiting
Check `User.ai_calls_today < Settings.ai_daily_limit_per_user` (100). Increment after successful call. Reset tracked via `ai_calls_reset_date`.
Source: `src/services/qa.py`
