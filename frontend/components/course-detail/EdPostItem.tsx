"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Star, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ExternalLinkDialog from "@/components/dashboard/ExternalLinkDialog";
import FeedbackButton from "@/components/shared/FeedbackButton";

interface EdPostItemProps {
  id: string;
  edThreadId?: string;
  title: string;
  author: string;
  summary: string;
  isEndorsed: boolean;
  isStaffPost: boolean;
  gpaRelevanceScore?: number;
  createdAt?: string;
  edCourseId?: string;
}

/**
 * Single Ed Discussion post row for Course Detail right panel.
 * Shows title, author, badges (endorsed/staff), summary,
 * and a FeedbackButton for AI-scored items.
 */
export default function EdPostItem({
  id,
  edThreadId,
  title,
  author,
  summary,
  isEndorsed,
  isStaffPost,
  gpaRelevanceScore,
  edCourseId,
}: EdPostItemProps) {
  const t = useTranslations("courseDetail");
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const threadUrl =
    edCourseId && edThreadId
      ? `https://edstem.org/au/courses/${edCourseId}/discussion/${edThreadId}`
      : undefined;

  const hasHighRelevance =
    gpaRelevanceScore != null && gpaRelevanceScore >= 0.7;

  return (
    <>
      <div
        className={cn(
          "py-[10px] border-b border-[#eae7e0] last:border-b-0",
          hasHighRelevance && "bg-[rgba(106,155,204,0.03)]",
        )}
      >
        {/* Title row with badges */}
        <div className="flex items-center gap-[6px] mb-[3px]">
          <MessageCircle size={13} className="text-[#6a9bcc] flex-shrink-0" />
          <span className="text-[0.78rem] font-semibold text-[#2d2d2a] leading-[1.35] line-clamp-1 flex-1">
            {threadUrl ? (
              <button
                type="button"
                onClick={() => setOpenUrl(threadUrl)}
                className="bg-transparent border-none p-0 cursor-pointer text-left font-semibold text-[#2d2d2a] hover:text-[#6a9bcc] transition-colors"
              >
                {title}
              </button>
            ) : (
              title
            )}
          </span>
          {isEndorsed && (
            <span className="text-[0.58rem] font-bold py-[1px] px-[5px] rounded-[3px] bg-[rgba(176,137,104,0.12)] text-[#b08968] flex-shrink-0 flex items-center gap-[2px]">
              <Star size={9} />
              {t("edPosts.endorsed")}
            </span>
          )}
          {isStaffPost && (
            <span className="text-[0.58rem] font-bold py-[1px] px-[5px] rounded-[3px] bg-[rgba(106,155,204,0.12)] text-[#6a9bcc] flex-shrink-0 flex items-center gap-[2px]">
              <Shield size={9} />
              {t("edPosts.staffPost")}
            </span>
          )}
        </div>

        {/* Author + summary + feedback */}
        <div className="text-[0.7rem] text-[#9b9b94] mb-[2px] pl-[19px]">
          {author}
        </div>
        <div className="text-[0.74rem] text-[#5c5c57] leading-[1.4] line-clamp-2 pl-[19px]">
          {summary}
          <FeedbackButton threadId={id} size="sm" />
        </div>
      </div>

      <ExternalLinkDialog
        open={openUrl !== null}
        url={openUrl ?? ""}
        onConfirm={() => setOpenUrl(null)}
        onCancel={() => setOpenUrl(null)}
      />
    </>
  );
}
