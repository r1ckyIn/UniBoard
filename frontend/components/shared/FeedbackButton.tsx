"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useFeedback } from "@/hooks/use-feedback";

interface FeedbackButtonProps {
  threadId: string;
  initialFeedback?: "thumbs_up" | "thumbs_down" | null;
  size?: "sm" | "md";
}

/**
 * Inline thumbs up/down feedback buttons for AI-scored items.
 * Sends feedback to backend via useFeedback mutation hook.
 */
export default function FeedbackButton({
  threadId,
  initialFeedback = null,
  size = "sm",
}: FeedbackButtonProps) {
  const [currentFeedback, setCurrentFeedback] = useState(initialFeedback);
  const { mutate, isPending } = useFeedback();

  const handleFeedback = (type: "thumbs_up" | "thumbs_down") => {
    if (isPending) return;
    const newType = currentFeedback === type ? null : type;
    // Toggle off visually (API uses UPSERT so re-submitting is safe)
    if (newType === null) {
      setCurrentFeedback(null);
      return;
    }
    setCurrentFeedback(newType);
    mutate({ threadId, feedbackType: newType });
  };

  const iconSize = size === "sm" ? 13 : 15;
  const btnBase =
    "p-[3px] rounded-[4px] transition-colors duration-150 cursor-pointer border-none bg-transparent";

  return (
    <span className="inline-flex items-center gap-[4px] ml-[6px]">
      <button
        type="button"
        onClick={() => handleFeedback("thumbs_up")}
        disabled={isPending}
        className={cn(
          btnBase,
          currentFeedback === "thumbs_up"
            ? "text-[#788c5d] bg-[rgba(120,140,93,0.15)]"
            : "text-[#b5b3aa] hover:text-[#788c5d] hover:bg-[rgba(120,140,93,0.08)]",
        )}
        aria-label="Helpful"
      >
        <ThumbsUp size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => handleFeedback("thumbs_down")}
        disabled={isPending}
        className={cn(
          btnBase,
          currentFeedback === "thumbs_down"
            ? "text-[#cc4455] bg-[rgba(204,68,85,0.15)]"
            : "text-[#b5b3aa] hover:text-[#cc4455] hover:bg-[rgba(204,68,85,0.08)]",
        )}
        aria-label="Not helpful"
      >
        <ThumbsDown size={iconSize} />
      </button>
    </span>
  );
}
