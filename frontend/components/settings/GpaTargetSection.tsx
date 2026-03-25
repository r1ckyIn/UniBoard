"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";

import { useUpdateProfile } from "@/hooks/use-user";
import { getGradeBand } from "@/lib/utils/grade-band";
import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];

interface GpaTargetSectionProps {
  user: User;
}

const BAND_STYLES: Record<string, string> = {
  HD: "bg-[rgba(120,140,93,.11)] text-[#788c5d]",
  D: "bg-[rgba(120,140,93,.11)] text-[#788c5d]",
  CR: "bg-[rgba(176,137,104,.11)] text-[#b08968]",
  P: "bg-[#efede6] text-[#9b9b94]",
  F: "bg-[rgba(204,68,85,.11)] text-[#cc4455]",
  "\u2014": "bg-[#efede6] text-[#9b9b94]",
};

/**
 * GPA target section: slider + numeric input + grade band badge + save.
 * Single state source prevents circular slider/input updates.
 */
export default function GpaTargetSection({ user }: GpaTargetSectionProps) {
  const t = useTranslations("settings");
  const updateProfile = useUpdateProfile();

  const [gpaValue, setGpaValue] = useState(user.gpa_target ?? 75);
  const [showSaved, setShowSaved] = useState(false);

  const gradeBand = getGradeBand(gpaValue);
  const bandStyle = BAND_STYLES[gradeBand] ?? BAND_STYLES["\u2014"];

  function handleChange(val: number) {
    const clamped = Math.min(100, Math.max(0, val));
    setGpaValue(clamped);
  }

  function handleSave() {
    updateProfile.mutate({ gpa_target: gpaValue });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }

  return (
    <div>
      {/* Display row */}
      <div className="flex items-center gap-[16px] mb-[16px]">
        <div className="flex flex-col">
          <span className="text-[0.7rem] text-[#9b9b94] uppercase tracking-[0.04em] mb-[2px]">
            {t("gpa.currentTarget")}
          </span>
          <span className="font-serif text-[2.2rem] font-bold text-[#d97757] leading-none">
            {gpaValue.toFixed(1)}
          </span>
        </div>
        <span
          className={`text-[0.78rem] font-semibold py-[4px] px-[12px] rounded-[6px] ${bandStyle}`}
        >
          {gradeBand}
        </span>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-[12px] mb-[6px]">
        <input
          type="range"
          role="slider"
          min={0}
          max={100}
          step={0.5}
          value={gpaValue}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="flex-1 appearance-none h-[6px] bg-[#eae7e0] rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#d97757] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_1px_5px_rgba(0,0,0,.18)]"
        />
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={gpaValue}
          onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
          className="w-[60px] py-[7px] px-[10px] font-serif text-[1rem] font-bold text-center border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,.11)]"
        />
        <button
          type="button"
          onClick={handleSave}
          className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] cursor-pointer transition-all duration-150 whitespace-nowrap bg-[#d97757] text-white border-none hover:bg-[#c5674a] flex items-center gap-[6px]"
        >
          {showSaved ? (
            <>
              <CheckCircle size={13} />
              {t("gpa.saved")}
            </>
          ) : (
            t("gpa.saveTarget")
          )}
        </button>
      </div>

      {/* Scale reference */}
      <div className="text-[0.72rem] text-[#9b9b94] pt-[12px] mt-[12px] border-t border-[#eae7e0]">
        {t("gpa.scale")}
      </div>
    </div>
  );
}
