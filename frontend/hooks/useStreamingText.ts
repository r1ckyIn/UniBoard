import { useState, useEffect, useRef } from "react";

export interface UseStreamingTextOptions {
  /** Raw text from upstream SSE source (from useAiStream's last assistant message). */
  source: string;
  /** Whether the upstream source is currently streaming. */
  isStreaming: boolean;
}

export interface UseStreamingTextReturn {
  /** Accumulated text (currently identical to source — pure adapter, kept for backward compat). */
  text: string;
  /**
   * Stable text up to but not including the most recent SSE delta.
   * Render this without animation in StreamingAssistant.
   */
  prefix: string;
  /**
   * The most recent delta — the suffix appended by the latest source change.
   * Render this with the chunk-fadein keyframe so only the new chunk fades in,
   * not the entire accumulated text.
   */
  delta: string;
  /** Whether streaming is active. */
  isStreaming: boolean;
  /**
   * Monotonic chunk index — bumped on each real delta from upstream.
   * Use as React key on the delta wrapper to re-trigger streaming-chunk-fadein.
   * Initial mount with empty source does NOT bump the index (avoids a phantom
   * remount that animates an empty span).
   */
  chunkIndex: number;
}

interface SplitState {
  prefix: string;
  delta: string;
  chunkIndex: number;
}

/**
 * Adapts useAiStream output into a streaming text contract for StreamingAssistant.
 *
 * Splits source into stable prefix + animated delta so the chunk-fadein keyframe
 * only replays on the newly arrived characters, not on the entire accumulated
 * message. Without this split, every SSE chunk would re-fade-in the whole text
 * (200+ remounts for a typical 200-token reply, producing visible flicker —
 * the opposite of the "smooth typewriter" intent).
 *
 * The split is held in state (not derived) so the React render that consumes
 * the hook always sees `prefix + delta === source` AND sees the same delta
 * across multiple renders within one chunk window — until the next real
 * upstream change arrives. This is what lets the keyed delta span persist
 * stably between unrelated re-renders.
 */
export function useStreamingText({
  source,
  isStreaming,
}: UseStreamingTextOptions): UseStreamingTextReturn {
  // Tracks the source value as of the previous committed render. Initialised
  // to undefined so we can distinguish "first mount with empty source" from
  // "source happens to be empty after previously having content".
  const prevSourceRef = useRef<string | undefined>(undefined);

  // Held-in-state split. Initial values reflect the very first render's source:
  //   - empty source -> prefix="" delta="" (no chunk yet)
  //   - non-empty   -> prefix="" delta=source (whole content is the first delta)
  const [split, setSplit] = useState<SplitState>(() => ({
    prefix: "",
    delta: source,
    chunkIndex: source === "" ? 0 : 1,
  }));

  useEffect(() => {
    // No-op when source did not actually change (e.g. unrelated re-render).
    if (prevSourceRef.current === source) return;

    // Initial mount with empty source — establish the baseline without burning
    // a chunk index. Otherwise StreamingAssistant animates a phantom empty span
    // immediately on mount.
    if (prevSourceRef.current === undefined && source === "") {
      prevSourceRef.current = source;
      return;
    }

    // First effect run with non-empty source: the initial state already
    // reflects (prefix="", delta=source, chunkIndex=1). Just record the
    // baseline ref so subsequent deltas compute against it.
    if (prevSourceRef.current === undefined) {
      prevSourceRef.current = source;
      return;
    }

    // Steady-state delta: compute new split and bump chunk index. React batches
    // multiple synchronous setState calls so this is safe even if upstream
    // rapidly emits 5 tokens in one render cycle.
    const prev = prevSourceRef.current;
    prevSourceRef.current = source;
    const nextPrefix = source.startsWith(prev) ? prev : "";
    const nextDelta = source.slice(nextPrefix.length);
    setSplit((s) => ({
      prefix: nextPrefix,
      delta: nextDelta,
      chunkIndex: s.chunkIndex + 1,
    }));
  }, [source]);

  return {
    text: source,
    prefix: split.prefix,
    delta: split.delta,
    isStreaming,
    chunkIndex: split.chunkIndex,
  };
}
