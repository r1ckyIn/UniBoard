"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

interface DigestUrgentBannerProps {
  criticalCount: number;
}

/**
 * Red alert banner shown when one or more critical highlights exist.
 * Returns null when criticalCount is 0 (banner hidden).
 */
export default function DigestUrgentBanner({
  criticalCount,
}: DigestUrgentBannerProps) {
  const t = useTranslations("digest");

  if (criticalCount === 0) return null;

  return (
    <AnimatedEntry delay={3}>
      <div className="bg-[rgba(204,68,85,0.04)] border-[1.5px] border-[rgba(204,68,85,0.15)] rounded-[14px] py-[14px] px-[20px] flex items-center gap-[12px]">
        <AlertTriangle
          size={18}
          className="text-[#cc4455] flex-shrink-0"
        />
        <span className="text-[0.82rem] text-[#2d2d2a] font-medium">
          <strong className="text-[#cc4455] font-bold">
            {criticalCount}
          </strong>{" "}
          {t("urgentBanner", { count: String(criticalCount) })}
        </span>
        <span className="font-serif text-[1.1rem] font-bold text-[#cc4455] ml-auto flex-shrink-0">
          {criticalCount}
        </span>
      </div>
    </AnimatedEntry>
  );
}
