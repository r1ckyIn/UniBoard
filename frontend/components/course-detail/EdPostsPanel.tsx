"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useCourseDiscussions } from "@/hooks/use-discussions";
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

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-[10px] px-[10px] py-[8px]"
              >
                <div className="flex-1 h-[14px] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
                <div className="w-[50px] h-[14px] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
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

        {/* Post list */}
        {!isLoading && discussions.length > 0 && (
          <div>
            {discussions.map((d, i) => (
              <div key={d.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenUrl(
                      `https://edstem.org/au/courses/${edCourseId}/discussion/${d.ed_thread_id}`
                    )
                  }
                  className="flex flex-col gap-[3px] px-[10px] py-[8px] rounded-[8px] hover:bg-[var(--card-bg-hover)] cursor-pointer w-full text-left transition-colors"
                >
                  {/* Row 1: Title */}
                  <span className="text-[0.78rem] font-semibold text-[var(--text-1)] truncate">
                    {d.title}
                  </span>

                  {/* Row 2: Author + Badges + Time */}
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[0.66rem] text-[var(--text-3)]">
                      {d.author}
                    </span>
                    {(d.is_endorsed || d.is_staff_post) && (
                      <span className="text-[0.5rem] text-[var(--text-3)]">&middot;</span>
                    )}
                    {d.is_endorsed && (
                      <span className="text-[0.64rem] font-bold bg-[rgba(120,140,93,.11)] text-[#788c5d] rounded-[4px] px-[6px] py-[1px]">
                        {t("edPosts.endorsed")}
                      </span>
                    )}
                    {d.is_staff_post && (
                      <span className="text-[0.64rem] font-bold bg-[rgba(106,155,204,.11)] text-[#6a9bcc] rounded-[4px] px-[6px] py-[1px]">
                        {t("edPosts.staffPost")}
                      </span>
                    )}
                    <span className="flex-1" />
                    <span className="text-[0.64rem] text-[var(--text-3)]">
                      {formatTime(d.created_at)}
                    </span>
                  </div>
                </button>
                {i < discussions.length - 1 && (
                  <div className="border-b border-[var(--divider)]" />
                )}
              </div>
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
