"use client";

import { useStreamingText } from "@/hooks/useStreamingText";

export interface StreamingAssistantProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Assistant message — no bubble, left-aligned, Source Serif 4 flowing text.
 * Per assistant-ui Claude clone reference (apps/docs/components/examples/claude.tsx).
 * Inline trailing cursor blinks during streaming; unmounts on stream complete.
 *
 * Renders as `{prefix}<span key={chunkIndex}>{delta}</span><cursor/>`. Only the
 * delta wrapper is keyed by chunkIndex, so the streaming-chunk-fadein keyframe
 * only replays on the freshly arrived characters — not on the entire accumulated
 * message. See useStreamingText comments for the prefix/delta split rationale.
 */
export default function StreamingAssistant({
  content,
  isStreaming = false,
}: StreamingAssistantProps) {
  const { prefix, delta, chunkIndex } = useStreamingText({
    source: content,
    isStreaming,
  });

  return (
    <div className="flex justify-start mb-[12px]">
      <div className="max-w-[85%] font-serif text-body text-text-1 leading-[1.65] whitespace-pre-wrap pr-2">
        {prefix && <span>{prefix}</span>}
        {delta && (
          <span
            // Re-key per chunk so only the delta fades in via streaming-chunk-fadein.
            // The prefix span above is intentionally NOT keyed and NOT animated —
            // already-rendered text must stay stable across chunk arrivals.
            key={chunkIndex}
            className="animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)_forwards]"
          >
            {delta}
          </span>
        )}
        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] bg-text-3 ml-[2px] align-middle"
            style={{
              animation:
                "streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite",
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
