"use client";

import { cn } from "@/lib/utils/cn";

interface AiChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

/**
 * Reusable chat bubble with user (right-aligned) and
 * assistant (left-aligned) styling per D-06.
 */
export default function AiChatBubble({
  role,
  content,
  isStreaming = false,
}: AiChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex mb-[8px]", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] px-[14px] py-[10px] rounded-[12px] text-[0.82rem] leading-[1.55] whitespace-pre-wrap",
          isUser
            ? "bg-[#d97757] text-white rounded-br-[4px]"
            : "bg-[#eae7e0] text-[#2d2d2a] rounded-bl-[4px]",
        )}
      >
        {content}
        {isStreaming && !content && (
          <span className="inline-block w-[6px] h-[14px] bg-[#9b9b94] animate-pulse ml-[2px]" />
        )}
        {isStreaming && content && (
          <span className="inline-block w-[2px] h-[14px] bg-[#9b9b94] animate-pulse ml-[1px]" />
        )}
      </div>
    </div>
  );
}
