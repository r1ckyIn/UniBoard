"use client";

import { useTranslations } from "next-intl";
import RoughCard from "@/components/design-system/RoughCard";

interface ProfileCardProps {
  name: string;
  faculty: string;
  year: number;
  semester: number;
  courseCount: number;
  creditPoints: number;
}

/**
 * Compute initials from a display name.
 * If name has a space, take first letter of first + last word.
 * Otherwise take first 2 characters.
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default function ProfileCard({
  name,
  faculty,
  year,
  semester,
  courseCount,
  creditPoints,
}: ProfileCardProps) {
  const t = useTranslations("dashboard");

  return (
    <RoughCard className="text-center" padding="py-6 px-5">
      {/* Avatar */}
      <div
        className="w-[52px] h-[52px] rounded-[14px] grid place-items-center text-white font-serif font-semibold text-[22px] mx-auto mb-3"
        style={{
          background: "linear-gradient(135deg, #d97757, #e8956e)",
          boxShadow: "0 2px 10px rgba(217,119,87,.25)",
        }}
      >
        {getInitials(name)}
      </div>

      {/* Name */}
      <div className="font-serif text-[1.02rem] font-semibold mb-[2px]">
        {name}
      </div>

      {/* Detail line 1: faculty . Year N */}
      <div className="text-[0.76rem] text-text-3">
        {faculty} &middot; Year {year}
      </div>

      {/* Detail line 2: YYYY Semester N */}
      <div className="text-[0.76rem] text-text-3 mt-[2px]">
        {new Date().getFullYear()} Semester {semester}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="border border-card-border rounded-sm py-2">
          <div className="font-serif text-[1.12rem] font-semibold">
            {courseCount}
          </div>
          <div className="text-[0.66rem] text-text-3 uppercase tracking-[0.04em]">
            {t("profile.statLabels.courses")}
          </div>
        </div>
        <div className="border border-card-border rounded-sm py-2">
          <div className="font-serif text-[1.12rem] font-semibold">
            {creditPoints}
          </div>
          <div className="text-[0.66rem] text-text-3 uppercase tracking-[0.04em]">
            {t("profile.statLabels.credits")}
          </div>
        </div>
      </div>
    </RoughCard>
  );
}
