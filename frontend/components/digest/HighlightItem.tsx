"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  HIGHLIGHT_CONFIG,
  COLOR_CLASSES,
  URGENCY_STYLES,
  SOURCE_MAP,
} from "@/lib/digest/types";

interface HighlightItemProps {
  type: string;
  summary: string;
  urgency: string;
  sourceThreadId?: string;
  createdAt?: string;
  courseCode?: string;
}

/**
 * Single highlight row: type-colored icon, type label,
 * source badge (Canvas/Ed), summary, relative time,
 * urgency badge, and optional "View thread" link.
 */
export default function HighlightItem({
  type,
  summary,
  urgency,
  sourceThreadId,
  createdAt,
  courseCode,
}: HighlightItemProps) {
  const t = useTranslations("digest");
  const locale = useLocale();
  const dateFnsLocale = locale === "zh" ? zhCN : enUS;

  const config = HIGHLIGHT_CONFIG[type] ?? HIGHLIGHT_CONFIG.new_grade;
  const colorCls = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.green;
  const IconComponent = config.icon;
  const urgencyStyle =
    URGENCY_STYLES[urgency] ?? URGENCY_STYLES.informational;
  const source = SOURCE_MAP[type] ?? "Canvas";

  return (
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
          {summary}
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
          {sourceThreadId && courseCode && (
            <>
              {createdAt && <span>&middot;</span>}
              <Link
                href={`/courses/${courseCode}?tab=posts`}
                className={cn("font-semibold cursor-pointer", colorCls.text)}
              >
                {t("viewThread")} &rarr;
              </Link>
            </>
          )}
          {sourceThreadId && !courseCode && (
            <>
              {createdAt && <span>&middot;</span>}
              <span className={cn("font-semibold", colorCls.text)}>
                {t("viewThread")} &rarr;
              </span>
            </>
          )}
        </div>
      </div>

      {/* Urgency badge */}
      <span
        className={cn(
          "text-[0.6rem] font-bold py-[2px] px-[7px] rounded-[4px] flex-shrink-0 mt-[2px]",
          urgencyStyle.bg,
          urgencyStyle.text,
        )}
      >
        {t(`urgency.${urgency}`)}
      </span>
    </div>
  );
}
