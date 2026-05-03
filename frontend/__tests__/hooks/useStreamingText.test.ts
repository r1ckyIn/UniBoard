import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStreamingText } from "@/hooks/useStreamingText";

describe("useStreamingText", () => {
  it("initial empty state does not bump chunkIndex", () => {
    const { result } = renderHook(() =>
      useStreamingText({ source: "", isStreaming: false }),
    );
    expect(result.current.text).toBe("");
    expect(result.current.prefix).toBe("");
    expect(result.current.delta).toBe("");
    expect(result.current.isStreaming).toBe(false);
    // CR-01/WR-08 fix: mount with empty source MUST NOT burn a chunk index.
    // Otherwise StreamingAssistant animates a phantom empty span on mount.
    expect(result.current.chunkIndex).toBe(0);
  });

  it("initial non-empty source bumps chunkIndex (treated as a real delta)", () => {
    const { result } = renderHook(() =>
      useStreamingText({ source: "Hello", isStreaming: true }),
    );
    expect(result.current.text).toBe("Hello");
    // First non-empty source counts as the first delta arrival.
    expect(result.current.chunkIndex).toBeGreaterThanOrEqual(1);
  });

  it("chunkIndex bumps only on actual delta arrivals", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } },
    );
    const i1 = result.current.chunkIndex;
    rerender({ source: "Hello world", isStreaming: true });
    const i2 = result.current.chunkIndex;
    rerender({ source: "Hello world!", isStreaming: true });
    const i3 = result.current.chunkIndex;
    // Re-render with the SAME source must NOT bump chunkIndex.
    rerender({ source: "Hello world!", isStreaming: true });
    const i4 = result.current.chunkIndex;
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBe(i3);
    expect(result.current.text).toBe("Hello world!");
  });

  it("prefix is the prior committed source; delta is only the new suffix", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } },
    );
    rerender({ source: "Hello world", isStreaming: true });
    expect(result.current.prefix).toBe("Hello");
    expect(result.current.delta).toBe(" world");
    expect(result.current.text).toBe("Hello world");
    rerender({ source: "Hello world!", isStreaming: true });
    expect(result.current.prefix).toBe("Hello world");
    expect(result.current.delta).toBe("!");
  });

  it("non-prefix source change collapses prefix and treats whole source as delta", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello world", isStreaming: true } },
    );
    // Upstream replaces content (e.g. user regenerates) — prior text is no
    // longer a prefix of the new source, so prefix collapses and the full
    // new source becomes the delta to fade in.
    rerender({ source: "Different reply", isStreaming: true });
    expect(result.current.prefix).toBe("");
    expect(result.current.delta).toBe("Different reply");
  });

  it("stream complete", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Done", isStreaming: true } },
    );
    rerender({ source: "Done.", isStreaming: false });
    expect(result.current.text).toBe("Done.");
    expect(result.current.isStreaming).toBe(false);
  });

  it("isStreaming false on completion", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } },
    );
    expect(result.current.isStreaming).toBe(true);
    rerender({ source: "Hello.", isStreaming: false });
    expect(result.current.isStreaming).toBe(false);
  });
});
