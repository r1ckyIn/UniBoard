"use client";

import { useTranslations } from "next-intl";
import { Radio, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import { cn } from "@/lib/utils/cn";
import { useDateFnsLocale } from "@/lib/utils/date-fns-locale";

interface DigestTitleRowProps {
  generatedAt: string;
  onRefresh: () => void;
  isFetching: boolean;
}

/**
 * Title row for the Digest page: Radio icon, heading,
 * date badge, "Generated X ago" text, and Refresh button.
 */
export default function DigestTitleRow({
  generatedAt,
  onRefresh,
  isFetching,
}: DigestTitleRowProps) {
  const t = useTranslations("digest");
  const dateFnsLocale = useDateFnsLocale();

  const date = new Date(generatedAt);

  return (
    <AnimatedEntry delay={1}>
      <div className="flex items-center justify-between px-[2px] mb-[4px]">
        {/* Left side: icon + heading + date badge */}
        <div className="flex items-center gap-[10px]">
          <Radio size={22} className="text-[#d97757] flex-shrink-0" />
          <h1 className="font-serif text-[1.5rem] font-bold text-[#2d2d2a] tracking-[-0.02em]">
            {t("title")}
          </h1>
          <span className="text-[0.68rem] font-semibold py-[3px] px-[10px] rounded-[6px] bg-[rgba(217,119,87,0.11)] text-[#d97757]">
            {format(date, "EEE, d MMM", { locale: dateFnsLocale })}
          </span>
        </div>

        {/* Right side: generated time + refresh button */}
        <div className="flex items-center gap-[8px]">
          <span className="text-[0.72rem] text-[#9b9b94] italic">
            {t("generatedAgo", { time: formatDistanceToNow(date, { locale: dateFnsLocale }) })}
          </span>
          <button
            className="flex items-center gap-[5px] text-[0.74rem] font-semibold py-[6px] px-[12px] rounded-[8px] bg-[#f6f5f0] border border-[#e8e5dd] text-[#6b6b65] cursor-pointer hover:bg-[#efede6] hover:text-[#2d2d2a] transition-all duration-150"
            disabled={isFetching}
            onClick={onRefresh}
          >
            <RefreshCw
              size={13}
              className={cn(isFetching && "animate-spin")}
            />
            {t("refresh")}
          </button>
        </div>
      </div>
    </AnimatedEntry>
  );
}
