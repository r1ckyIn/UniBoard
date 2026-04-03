"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { useDateFnsLocale } from "@/lib/utils/date-fns-locale";
import { cn } from "@/lib/utils/cn";
import ExternalLinkDialog from "@/components/dashboard/ExternalLinkDialog";
import {
  HIGHLIGHT_CONFIG,
  COLOR_CLASSES,
  URGENCY_STYLES,
  SCORE_URGENCY_MAP,
  SOURCE_MAP,
} from "@/lib/digest/types";
import FeedbackButton from "@/components/shared/FeedbackButton";

interface HighlightItemProps {
  type: string;
  summary: string;
  summaryZh?: string;
  urgency: string;
  urgencyScore?: number;
  threadId?: string;
  sourceThreadId?: string;
  sourceUrl?: string;
  createdAt?: string;
  courseCode?: string;
}

/**
 * Single highlight row: type-colored icon, type label,
 * source badge (Canvas/Ed), summary, relative time,
 * urgency badge, and external link with confirmation dialog.
 */
export default function HighlightItem({
  type,
  summary,
  summaryZh,
  urgency,
  urgencyScore,
  threadId,
  sourceUrl,
  createdAt,
}: HighlightItemProps) {
  const t = useTranslations("digest");
  const locale = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const config = HIGHLIGHT_CONFIG[type] ?? HIGHLIGHT_CONFIG.new_grade;
  const colorCls = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.green;
  const IconComponent = config.icon;

  // Use numeric score-based mapping (D-12) when available, else fall back to string-based
  const scoreStyle =
    urgencyScore != null ? SCORE_URGENCY_MAP[urgencyScore] : undefined;
  const urgencyStyle = scoreStyle ?? URGENCY_STYLES[urgency] ?? URGENCY_STYLES.informational;
  const urgencyLabel = scoreStyle
    ? t(`urgency.${scoreStyle.label}`)
    : t(`urgency.${urgency}`);
  const source = SOURCE_MAP[type] ?? "Canvas";

  // Pick localized summary
  const displaySummary = locale === "zh" && summaryZh ? summaryZh : summary;

  // Link label based on source platform
  const linkLabel = source === "Canvas" ? t("viewNotification") : t("viewThread");

  return (
    <>
      <div className="flex items-start gap-[12px] py-[12px] border-b border-[#eae7e0] last:border-b-0 hover:bg-[rgba(0,0,0,0.01)] hover:mx-[-8px] hover:px-[8px] hover:rounded-[8px] transition-[background] duration-150">
        {/* Icon */}
        <div
          className={cn(
            "w-[30px] h-[30px] rounded-[8px] grid place-items-center flex-shrink-0 mt-[1px]",
            colorCls.bg,
          )}
        >
          <IconComponent size={14} className={colorCls.text} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-[0.66rem] font-semibold uppercase tracking-[0.04em] mb-[2px]",
              colorCls.text,
            )}
          >
            {config.label}
            <span className="text-[0.6rem] font-medium ml-[6px] py-[1px] px-[5px] rounded-[4px] bg-[#f6f5f0] border border-[#e8e5dd] text-[#9b9b94] normal-case tracking-normal">
              {source}
            </span>
          </div>
          <div className="text-[0.84rem] text-[#2d2d2a] font-medium leading-[1.45]">
            {displaySummary}
          </div>
          <div className="text-[0.7rem] text-[#9b9b94] mt-[3px] flex items-center gap-[6px]">
            {createdAt && (
              <span>
                {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </span>
            )}
            {sourceUrl && (
              <>
                {createdAt && <span>&middot;</span>}
                <button
                  type="button"
                  onClick={() => setOpenUrl(sourceUrl)}
                  className={cn(
                    "font-semibold cursor-pointer bg-transparent border-none p-0 text-[0.7rem]",
                    colorCls.text,
                  )}
                >
                  {linkLabel} &rarr;
                </button>
              </>
            )}
          </div>
        </div>

        {/* Urgency badge + feedback */}
        <span className="flex items-center gap-[4px] flex-shrink-0 mt-[2px]">
          <span
            className={cn(
              "text-[0.6rem] font-bold py-[2px] px-[7px] rounded-[4px]",
              urgencyStyle.bg,
              urgencyStyle.text,
            )}
          >
            {urgencyLabel}
          </span>
          {threadId && <FeedbackButton threadId={threadId} size="sm" />}
        </span>
      </div>

      {/* External link confirmation dialog */}
      <ExternalLinkDialog
        open={openUrl !== null}
        url={openUrl ?? ""}
        onConfirm={() => setOpenUrl(null)}
        onCancel={() => setOpenUrl(null)}
      />
    </>
  );
}
