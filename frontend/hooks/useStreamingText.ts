import { useState, useEffect } from "react";

export interface UseStreamingTextOptions {
  /** Raw text from upstream SSE source (from useAiStream's last assistant message). */
  source: string;
  /** Whether the upstream source is currently streaming. */
  isStreaming: boolean;
}

export interface UseStreamingTextReturn {
  /** Accumulated text (currently identical to source — pure adapter). */
  text: string;
  /** Whether streaming is active. */
  isStreaming: boolean;
  /**
   * Monotonic chunk index — bumped on each delta from upstream.
   * Use as React key on cursor span to re-trigger streaming-chunk-fadein keyframe.
   */
  chunkIndex: number;
}

/**
 * Adapts useAiStream output into a streaming text contract for StreamingAssistant.
 * Tracks chunk-arrival index so the cursor span can re-trigger the
 * streaming-chunk-fadein keyframe on every chunk.
 */
export function useStreamingText({
  source,
  isStreaming,
}: UseStreamingTextOptions): UseStreamingTextReturn {
  const [chunkIndex, setChunkIndex] = useState(0);

  useEffect(() => {
    // Bump chunkIndex on every text delta. React batches multiple
    // synchronous setState calls so this is safe even if upstream rapidly
    // emits 5 tokens in one render cycle.
    setChunkIndex((prev) => prev + 1);
  }, [source]);

  return {
    text: source,
    isStreaming,
    chunkIndex,
  };
}
