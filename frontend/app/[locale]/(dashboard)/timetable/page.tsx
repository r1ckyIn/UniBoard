"use client";

import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import RoughCard from "@/components/design-system/RoughCard";

/**
 * Timetable "Coming Soon" placeholder page.
 */
export default function TimetablePage() {
  const t = useTranslations("common");

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RoughCard className="flex flex-col items-center gap-4 p-10 rounded-[14px]" style={{
        background: "var(--color-card-bg)",
      }}>
        <Calendar size={48} style={{ color: "var(--color-text-3)" }} />
        <h2
          className="text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Timetable
        </h2>
        <p style={{ color: "var(--color-text-3)" }}>
          {t("comingSoon")}
        </p>
      </RoughCard>
    </div>
  );
}
