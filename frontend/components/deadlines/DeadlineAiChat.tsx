"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUp, Info, MessageCircle } from "lucide-react";
import { useAiStream } from "@/hooks/use-ai-stream";
import AiChatBubble from "@/components/shared/AiChatBubble";
import RoughCard from "@/components/design-system/RoughCard";

interface DeadlineAiChatProps {
  courseId: string;
  isExpanded: boolean;
}

/**
 * Embedded AI chat component for deadline cards per D-04/D-05/D-06/D-07/D-08.
 * Renders functional streaming chat replacing the old "Coming Soon" placeholder.
 */
export default function DeadlineAiChat({
  courseId,
  isExpanded,
}: DeadlineAiChatProps) {
  const t = useTranslations("deadlines");
  const locale = useLocale();
  const { messages, isStreaming, status, error, sendMessage, clearMessages } =
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

  // Clear on collapse
  useEffect(() => {
    if (!isExpanded) {
      clearMessages();
      setInput("");
    }
  }, [isExpanded, clearMessages]);

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
      <RoughCard padding="py-[12px] px-[16px]" disableHover>
        {/* Section title */}
        <div className="font-serif text-[0.84rem] font-semibold text-[#2d2d2a] mb-[8px] flex items-center gap-[6px]">
          <MessageCircle size={16} className="text-[#d97757] flex-shrink-0" />
          {t("askAbout")}
        </div>

        {/* Context note (D-07) */}
        <div className="text-[0.66rem] text-[#9b9b94] italic mb-[8px] flex items-center gap-[4px]">
          <Info size={12} className="flex-shrink-0" />
          {t("aiContextNote")}
        </div>

        {/* Chat messages area */}
        {messages.length > 0 && (
          <div
            ref={scrollRef}
            className="max-h-[300px] overflow-y-auto mb-[8px] px-[4px]"
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

        {/* Status indicator (D-02) */}
        {status && (
          <div className="text-[0.72rem] text-[#9b9b94] italic mb-[6px] animate-pulse">
            {status === "searching" ? t("aiSearching") : t("aiAnalyzing")}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="text-[0.72rem] text-red-500 mb-[6px]">{error}</div>
        )}

        {/* Input row */}
        <div data-ai-input-row className="flex items-center gap-[10px]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="flex-1 border-[1.5px] border-[#e8e5dd] rounded-full bg-[#f6f5f0] px-[20px] py-[10px] text-[0.82rem] text-[#2d2d2a] outline-none focus:border-[#d97757] transition-colors disabled:opacity-50"
            placeholder={t("aiPlaceholder")}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="w-[36px] h-[36px] rounded-full bg-[#d97757] text-white grid place-items-center flex-shrink-0 disabled:opacity-50 hover:bg-[#c4623e] transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        </div>

        {/* Disclaimer (D-07) */}
        <p className="text-[0.64rem] text-[#9b9b94] mt-[6px] text-center italic">
          {t("aiDisclaimer")}
        </p>
      </RoughCard>
    </div>
  );
}
