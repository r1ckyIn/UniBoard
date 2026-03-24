"use client";

import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

const ClientOnlyRoughCard = withClientOnly(
  () => import("@/components/design-system/RoughCard")
);

interface DigestSummaryCardProps {
  updates: number;
  courses: number;
  grades: number;
  urgent: number;
}

/**
 * Inline helper for a single stat cell in the 2x2 grid.
 */
function StatCell({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-[rgba(250,249,245,0.55)] border border-[#e8e5dd] rounded-[8px] py-[10px] px-[8px] text-center">
      <div
        className="font-serif text-[1.1rem] font-bold"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[0.64rem] text-[#9b9b94] uppercase tracking-[0.04em] mt-[2px]">
        {label}
      </div>
    </div>
  );
}

/**
 * Right panel summary card with 2x2 stats grid
 * showing Updates, Courses, Grades, and Urgent counts.
 */
export default function DigestSummaryCard({
  updates,
  courses,
  grades,
  urgent,
}: DigestSummaryCardProps) {
  const t = useTranslations("digest");

  return (
    <AnimatedEntry delay={5}>
      <ClientOnlyRoughCard disableHover padding="py-[0px] px-[0px]">
        <div className="py-[22px] px-[20px]">
          {/* Title */}
          <div className="text-[0.82rem] font-semibold flex items-center gap-[7px] mb-[14px] text-[#2d2d2a]">
            <BarChart3
              size={16}
              className="text-[#d97757] flex-shrink-0"
            />
            {t("summary.title")}
          </div>
          {/* 2x2 stats grid */}
          <div className="grid grid-cols-2 gap-[8px]">
            <StatCell
              value={updates}
              label={t("summary.updates")}
              color="#d97757"
            />
            <StatCell
              value={courses}
              label={t("summary.courses")}
              color="#6a9bcc"
            />
            <StatCell
              value={grades}
              label={t("summary.grades")}
              color="#788c5d"
            />
            <StatCell
              value={urgent}
              label={t("summary.urgent")}
              color="#cc4455"
            />
          </div>
        </div>
      </ClientOnlyRoughCard>
    </AnimatedEntry>
  );
}
