"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useCourseDiscussions } from "@/hooks/use-discussions";
import { discussionTitleZh } from "@/lib/fixtures/discussions";
import RoughCard from "@/components/design-system/RoughCard";
import ExternalLinkDialog from "@/components/dashboard/ExternalLinkDialog";

interface EdPostsPanelProps {
  courseId: string;
  edCourseId: string;
}

/**
 * Right panel card showing high-value Ed Discussion posts
 * (endorsed or staff-answered) with author, badges, and locale-aware relative time.
 */
export default function EdPostsPanel({
  courseId,
  edCourseId,
}: EdPostsPanelProps) {
  const t = useTranslations("courseDetail");
  const locale = useLocale();
  const dateFnsLocale = locale === "zh" ? zhCN : enUS;
  const { data, isLoading } = useCourseDiscussions(courseId, "high_value");

  // Track which post's dialog is open
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const discussions = data?.data ?? [];

  /**
   * Format relative time for a post creation date using locale-aware formatting.
   */
  function formatTime(createdAt: string): string {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dateFnsLocale });
    } catch {
      return createdAt;
    }
  }

  return (
    <>
      <RoughCard disableHover padding="px-[18px] py-[16px]">
        {/* Title */}
        <div className="text-[0.92rem] font-semibold flex items-center gap-[8px] mb-[12px]">
          <MessageCircle size={16} className="text-[#d97757]" />
          {t("edPosts.title")}
        </div>

        {/* Loading state — matches CourseDeadlinesPanel skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-[6px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex gap-[10px] items-stretch px-[10px] py-[10px] rounded-[8px]"
              >
                <div className="w-[3px] rounded-[2px] bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
                <div className="flex-1 flex flex-col justify-center gap-[4px]">
                  <div className="h-[12px] w-[70%] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
                  <div className="h-[10px] w-[50%] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && discussions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-[24px] text-[#9b9b94]">
            <MessageCircle size={20} className="mb-[6px]" />
            <span className="text-[0.84rem]">{t("edPosts.empty")}</span>
          </div>
        )}

        {/* Post list — layout mirrors CourseDeadlinesPanel: stripe | info | badge */}
        {!isLoading && discussions.length > 0 && (
          <div className="flex flex-col gap-[6px]">
            {discussions.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() =>
                  setOpenUrl(
                    `https://edstem.org/au/courses/${edCourseId}/discussion/${d.ed_thread_id}`
                  )
                }
                className="flex gap-[10px] items-stretch px-[10px] py-[10px] rounded-[8px] hover:bg-[var(--card-bg-hover)] cursor-pointer w-full text-left transition-colors relative"
              >
                {/* Left color stripe — Ed blue */}
                <div className="w-[3px] rounded-[2px] flex-shrink-0 bg-[#6a9bcc]" />

                {/* Info column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-[0.72rem] font-semibold text-[var(--text-1)] truncate mb-[2px]">
                    {locale === "zh" ? (discussionTitleZh[d.id] ?? d.title) : d.title}
                  </div>
                  <div className="flex items-center gap-[5px]">
                    <span className="text-[0.64rem] text-[var(--text-3)]">
                      {d.author}
                    </span>
                    {d.is_endorsed && (
                      <span className="text-[0.58rem] font-bold bg-[rgba(120,140,93,.11)] text-[#788c5d] rounded-[4px] px-[5px] py-[1px]">
                        {t("edPosts.endorsed")}
                      </span>
                    )}
                    {d.is_staff_post && (
                      <span className="text-[0.58rem] font-bold bg-[rgba(106,155,204,.11)] text-[#6a9bcc] rounded-[4px] px-[5px] py-[1px]">
                        {t("edPosts.staffPost")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time badge — positioned like deadline days badge */}
                <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[0.62rem] text-[var(--text-3)] whitespace-nowrap">
                  {formatTime(d.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </RoughCard>

      {/* Shared ExternalLinkDialog - outside RoughCard to avoid clipping */}
      <ExternalLinkDialog
        open={openUrl !== null}
        url={openUrl ?? ""}
        onConfirm={() => setOpenUrl(null)}
        onCancel={() => setOpenUrl(null)}
      />
    </>
  );
}
