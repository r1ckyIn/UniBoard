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
 */
export default function StreamingAssistant({
  content,
  isStreaming = false,
}: StreamingAssistantProps) {
  const { text, chunkIndex } = useStreamingText({
    source: content,
    isStreaming,
  });

  return (
    <div className="flex justify-start mb-[12px]">
      <div className="max-w-[85%] font-serif text-body text-text-1 leading-[1.65] whitespace-pre-wrap pr-2">
        <span
          // Re-key per chunk so the new text fades in via streaming-chunk-fadein
          key={chunkIndex}
          className="animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)_forwards]"
        >
          {text}
        </span>
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
