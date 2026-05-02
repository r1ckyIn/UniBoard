import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStreamingText } from "@/hooks/useStreamingText";

describe("useStreamingText", () => {
  it("initial empty state", () => {
    const { result } = renderHook(() =>
      useStreamingText({ source: "", isStreaming: false }),
    );
    expect(result.current.text).toBe("");
    expect(result.current.isStreaming).toBe(false);
    // chunkIndex starts at 1 (initial useEffect bumps from 0 -> 1)
    expect(result.current.chunkIndex).toBeGreaterThanOrEqual(1);
  });

  it("chunkIndex bumps", () => {
    const { result, rerender } = renderHook(
      ({ source, isStreaming }) => useStreamingText({ source, isStreaming }),
      { initialProps: { source: "Hello", isStreaming: true } },
    );
    const i1 = result.current.chunkIndex;
    rerender({ source: "Hello world", isStreaming: true });
    const i2 = result.current.chunkIndex;
    rerender({ source: "Hello world!", isStreaming: true });
    const i3 = result.current.chunkIndex;
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(result.current.text).toBe("Hello world!");
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
