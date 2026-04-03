"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUp, Info } from "lucide-react";
import { useAiStream } from "@/hooks/use-ai-stream";
import AiChatBubble from "@/components/shared/AiChatBubble";
import RoughCard from "@/components/design-system/RoughCard";

interface AiCourseChatProps {
  courseId: string;
  courseCode: string;
}

/**
 * Functional course Q&A chat replacing AiChatPlaceholder.
 * Streams AI responses token-by-token using the unified QA endpoint.
 */
export default function AiCourseChat({
  courseId,
  courseCode,
}: AiCourseChatProps) {
  const t = useTranslations("courseDetail");
  const locale = useLocale();
  const { messages, isStreaming, status, error, sendMessage } =
    useAiStream(courseId, locale);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (
      scrollRef.current &&
      typeof scrollRef.current.scrollTo === "function"
    ) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-[8px]">
      <RoughCard padding="py-[16px] px-[20px]" disableHover>
        {/* Title */}
        <div className="font-serif text-[0.88rem] font-semibold text-[#2d2d2a] mb-[10px]">
          {t("aiChat.title")}
        </div>

        {/* Context note */}
        <div className="text-[0.66rem] text-[#9b9b94] italic mb-[8px] flex items-center gap-[4px]">
          <Info size={12} className="flex-shrink-0" />
          {t("aiChat.contextNote")}
        </div>

        {/* Chat messages area */}
        {messages.length > 0 && (
          <div
            ref={scrollRef}
            className="max-h-[400px] overflow-y-auto mb-[8px] px-[4px]"
          >
            {messages.map((msg, i) => (
              <AiChatBubble
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  msg.role === "assistant"
                }
              />
            ))}
          </div>
        )}

        {/* Status indicator */}
        {status && (
          <div className="text-[0.72rem] text-[#9b9b94] italic mb-[6px] animate-pulse">
            {status === "searching"
              ? t("aiChat.searching")
              : t("aiChat.analyzing")}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="text-[0.72rem] text-red-500 mb-[6px]">{error}</div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-[10px]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="flex-1 border-[1.5px] border-[#e8e5dd] rounded-full bg-[#f6f5f0] px-[20px] py-[12px] text-[0.84rem] text-[#2d2d2a] outline-none focus:border-[#d97757] transition-colors disabled:opacity-50"
            placeholder={t("aiChat.placeholder", { courseCode })}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="w-[40px] h-[40px] rounded-full bg-[#d97757] text-white grid place-items-center flex-shrink-0 disabled:opacity-50 hover:bg-[#c4623e] transition-colors"
          >
            <ArrowUp size={18} />
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[0.66rem] text-[#9b9b94] mt-[8px] text-center italic">
          {t("aiChat.disclaimer")}
        </p>
      </RoughCard>
    </div>
  );
}
