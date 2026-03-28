"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BookOpen, Loader2 } from "lucide-react";
import { streamAiGet } from "@/lib/api/ai-stream";
import { useAuthStore } from "@/lib/auth/store";
import RoughCard from "@/components/design-system/RoughCard";

interface UnitReviewSectionProps {
  courseId: string;
  courseName: string;
}

/**
 * Streaming unit review display.
 * Requests an AI-generated structured review summary (key concepts,
 * common mistakes, exam scope) via GET SSE endpoint.
 */
export default function UnitReviewSection({
  courseId,
  courseName,
}: UnitReviewSectionProps) {
  const t = useTranslations("courseDetail");
  const locale = useLocale();
  const [reviewText, setReviewText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Page-level auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
  }, [reviewText, isStreaming]);

  const generateReview = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setStatus("analyzing");
    setReviewText("");
    setError(null);

    const token = useAuthStore.getState().accessToken;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    const url = `${apiBase}/api/v1/courses/${courseId}/review/stream?lang=${locale}`;

    let text = "";
    try {
      for await (const event of streamAiGet(url, token, controller.signal)) {
        if (event.event === "status") {
          setStatus(event.data.phase as string);
        } else if (event.event === "token") {
          text += event.data.text as string;
          setReviewText(text);
          setStatus(null);
        } else if (event.event === "done") {
          setIsStreaming(false);
          setStatus(null);
        } else if (event.event === "error") {
          setError(event.data.message as string);
          setIsStreaming(false);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setIsStreaming(false);
      setStatus(null);
    }
  }, [courseId, locale]);

  return (
    <div className="mt-[16px]">
      <div className="flex items-center justify-between mb-[10px]">
        <div className="font-serif text-[0.88rem] font-semibold text-[#2d2d2a] flex items-center gap-[6px]">
          <BookOpen size={16} className="text-[#d97757]" />
          {t("unitReview.title")}
        </div>
        <button
          onClick={generateReview}
          disabled={isStreaming}
          className="text-[0.76rem] font-semibold text-[#d97757] hover:text-[#c4623e] disabled:opacity-50 transition-colors"
        >
          {isStreaming
            ? t("unitReview.generating")
            : t("unitReview.generate")}
        </button>
      </div>

      {status && (
        <div className="flex items-center gap-[6px] text-[0.76rem] text-[#9b9b94] mb-[8px]">
          <Loader2 size={14} className="animate-spin" />
          {t("unitReview.analyzing")}
        </div>
      )}

      {error && (
        <div className="text-[0.72rem] text-red-500 mb-[8px]">{error}</div>
      )}

      {reviewText && (
        <RoughCard padding="py-[16px] px-[20px]" disableHover>
          <div ref={bottomRef} className="text-[0.82rem] text-[#2d2d2a] leading-[1.7] whitespace-pre-wrap">
            {reviewText}
          </div>
        </RoughCard>
      )}
    </div>
  );
}
