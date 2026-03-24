"use client";

import { useTranslations } from "next-intl";
import { Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

const ClientOnlyRoughCard = withClientOnly(
  () => import("@/components/design-system/RoughCard")
);

interface DigestHistoryCardProps {
  history: Array<{
    digest_id: string;
    generated_at: string;
    period: string;
    highlight_count: number;
  }>;
  selectedId: string | null;
  onSelect: (digestId: string) => void;
  isLoading?: boolean;
}

/**
 * Right panel recent digests list.
 * Clicking a history entry highlights it as selected.
 * // TODO(M2): Fetch specific digest by ID when /digest/{id} endpoint exists
 */
export default function DigestHistoryCard({
  history,
  selectedId,
  onSelect,
}: DigestHistoryCardProps) {
  const t = useTranslations("digest");

  return (
    <AnimatedEntry delay={7}>
      <ClientOnlyRoughCard disableHover padding="py-[0px] px-[0px]">
        <div className="py-[22px] px-[20px]">
          {/* Title */}
          <div className="text-[0.82rem] font-semibold flex items-center gap-[7px] mb-[14px] text-[#2d2d2a]">
            <Clock
              size={16}
              className="text-[#d97757] flex-shrink-0"
            />
            {t("history.title")}
          </div>
          {/* History list */}
          {history.map((item) => (
            <div
              key={item.digest_id}
              onClick={() => onSelect(item.digest_id)}
              className={cn(
                "flex items-center gap-[10px] py-[9px] border-b border-[#eae7e0] last:border-b-0 cursor-pointer transition-[background] duration-150",
                "hover:bg-[rgba(0,0,0,0.015)] hover:mx-[-6px] hover:px-[6px] hover:rounded-[8px]",
                selectedId === item.digest_id &&
                  "bg-[rgba(217,119,87,0.11)] mx-[-6px] px-[6px] rounded-[8px]"
              )}
            >
              <span className="text-[0.78rem] font-semibold text-[#2d2d2a] flex-1 min-w-0">
                {format(new Date(item.generated_at), "EEE d MMM")}
              </span>
              <span className="text-[0.66rem] font-semibold text-[#9b9b94]">
                {t("history.items", {
                  count: String(item.highlight_count),
                })}
              </span>
              <ChevronRight
                size={14}
                className="text-[#9b9b94] flex-shrink-0"
              />
            </div>
          ))}
        </div>
      </ClientOnlyRoughCard>
    </AnimatedEntry>
  );
}
