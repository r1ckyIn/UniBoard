/**
 * Tests for useAiStream sources event parsing (AIFEAT-02 / Phase 34 Plan 34-05).
 *
 * Verifies the hook:
 * 1. Parses `event: sources` SSE events into state.sources
 * 2. Resets state.sources to [] on clearMessages()
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Mock SSE stream source ─────────────────────────────────────────────────
vi.mock("@/lib/api/ai-stream", () => ({
  streamAiResponse: vi.fn(async function* () {
    yield { event: "status", data: { phase: "searching" } };
    yield {
      event: "sources",
      data: {
        sources: [
          {
            index: 1,
            module_id: "mod_abc",
            title: "Lecture 1",
            source_type: "module_item",
            anchor: null,
            score: 0.92,
            excerpt: "Hello world example...",
          },
        ],
      },
    };
    yield { event: "token", data: { text: "Hello " } };
    yield { event: "token", data: { text: "world" } };
    yield { event: "done", data: { status: "complete" } };
  }),
}));

// ── Mock auth store used inside the hook ───────────────────────────────────
vi.mock("@/lib/auth/store", () => ({
  useAuthStore: {
    getState: () => ({ accessToken: "test-token" }),
  },
}));

import { useAiStream } from "@/hooks/use-ai-stream";

describe("useAiStream sources event", () => {
  it("parses sources event into state.sources (AIFEAT-02 / Phase 34)", async () => {
    const { result } = renderHook(() => useAiStream("fake-course-id"));

    act(() => {
      result.current.sendMessage("What is X?");
    });

    await waitFor(() => {
      expect(result.current.sources.length).toBe(1);
    });

    expect(result.current.sources[0].title).toBe("Lecture 1");
    expect(result.current.sources[0].index).toBe(1);
    expect(result.current.sources[0].score).toBe(0.92);
  });

  it("clearMessages resets sources to empty array (AIFEAT-02 / Phase 34)", async () => {
    const { result } = renderHook(() => useAiStream("fake-course-id"));

    act(() => {
      result.current.sendMessage("What is X?");
    });

    await waitFor(() => {
      expect(result.current.sources.length).toBe(1);
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.sources).toEqual([]);
  });
});
