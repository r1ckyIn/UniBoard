"use client";

import { useTranslations } from "next-intl";
import type { components } from "@/lib/api/types.gen";
import { getGradeBand } from "@/lib/utils/grade-band";
import RoughCard from "@/components/design-system/RoughCard";

type User = components["schemas"]["User"];

interface SettingsAccountCardProps {
  user: User;
  courseCount: number;
  wam: number | null;
}

/**
 * Right panel account card — avatar with initials, name, email, and stats row
 * (Courses, WAM, Band).
 */
export default function SettingsAccountCard({ user, courseCount, wam }: SettingsAccountCardProps) {
  const t = useTranslations("settings");

  // Extract initials: first char of first name + first char of last name
  const parts = user.display_name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : user.display_name.slice(0, 2).toUpperCase();

  return (
    <RoughCard>
      <div className="text-center py-[4px] px-[0px]">
        {/* Avatar */}
        <div
          className="w-[56px] h-[56px] rounded-[14px] mx-auto mb-[12px] grid place-items-center text-white font-bold text-[20px] font-serif"
          style={{ background: "linear-gradient(135deg, #d97757, #e8956e)" }}
        >
          {initials}
        </div>

        {/* Name and email */}
        <div className="font-serif text-[1.1rem] font-semibold mb-[2px]">
          {user.display_name}
        </div>
        <div className="text-[0.74rem] text-[#9b9b94] mb-[12px]">
          {user.email}
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-[16px] pt-[12px] border-t border-[#eae7e0]">
          <div className="text-center">
            <div className="font-serif text-[1.1rem] font-bold text-[#d97757]">
              {courseCount}
            </div>
            <div className="text-[0.64rem] text-[#9b9b94] uppercase tracking-[0.04em]">
              {t("rightPanel.courses")}
            </div>
          </div>
          <div className="text-center">
            <div className="font-serif text-[1.1rem] font-bold text-[#788c5d]">
              {wam != null ? wam.toFixed(1) : "\u2014"}
            </div>
            <div className="text-[0.64rem] text-[#9b9b94] uppercase tracking-[0.04em]">
              {t("rightPanel.wam")}
            </div>
          </div>
          <div className="text-center">
            <div className="font-serif text-[1.1rem] font-bold text-[#6a9bcc]">
              {getGradeBand(wam)}
            </div>
            <div className="text-[0.64rem] text-[#9b9b94] uppercase tracking-[0.04em]">
              {t("rightPanel.band")}
            </div>
          </div>
        </div>
      </div>
    </RoughCard>
  );
}
