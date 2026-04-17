/**
 * SSE client for POST-based AI streaming endpoints.
 * Uses fetch + ReadableStream to parse text/event-stream responses.
 * EventSource only supports GET; Q&A needs POST with question body.
 */

// Phase 34 AIFEAT-02 — citation source payload emitted via `event: sources`
// BEFORE the first `event: token`. Frontend renders inline [N] markers +
// collapsible Sources panel tied to the index field.
//
// Phase 34 HI-01 fix: `title` and `module_id` may be null for legacy rows
// embedded before the per-source attribution fix (source_type="mixed"). The
// Sources component renders a labelled fallback using source_type +
// chunk_index when title is null. `source_type` is typed as a string union
// plus "mixed" to accept legacy rows without breaking compile-time.
export interface CitationSource {
  index: number; // 1-based marker matching inline [N]
  module_id: string | null;
  title: string | null;
  source_type: "module_item" | "lesson" | "mixed";
  source_id?: string;
  chunk_index?: number;
  anchor: string | null;
  score: number; // 0-1 cosine similarity (1 - pgvector distance / 2)
  excerpt: string; // server-truncated preview (~100 chars)
}

export interface SSEEvent {
  event: "status" | "token" | "done" | "error" | "sources";
  data: Record<string, unknown>;
}

/** Parse a ReadableStream of SSE bytes into typed events. */
async function* parseSseStream(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "token";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
            yield { event: currentEvent as SSEEvent["event"], data };
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream AI response from SSE endpoint via POST.
 * Yields parsed SSE events. Supports AbortSignal for cleanup.
 */
export async function* streamAiResponse(
  url: string,
  body: Record<string, unknown>,
  token: string | null,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`SSE error: ${response.status}`);
  }

  yield* parseSseStream(response);
}

/**
 * Stream AI response from SSE endpoint via GET.
 * Used for review/stream which uses GET with query params.
 */
export async function* streamAiGet(
  url: string,
  token: string | null,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`SSE error: ${response.status}`);
  }

  yield* parseSseStream(response);
}
