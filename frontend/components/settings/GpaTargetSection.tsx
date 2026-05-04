"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";

import { useUpdateProfile } from "@/hooks/use-user";
import { getGradeBand } from "@/lib/utils/grade-band";
import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];

// Phase 34 AIFEAT-03: USYD band quick-pick chips (descending value order).
const BAND_CHIPS = [
  { key: "highDistinction", value: 85 },
  { key: "distinction", value: 75 },
  { key: "credit", value: 65 },
  { key: "pass", value: 50 },
] as const;

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
 * GPA target section: 4-band quick-pick chips + slider + numeric input +
 * remaining_credit_points input + grade band badge + atomic save.
 *
 * Phase 34 AIFEAT-03: remaining_credit_points feeds the multi-course path
 * planner. Save persists BOTH gpa_target AND remaining_credit_points in a
 * single PATCH /users/me mutation.
 *
 * Single state source prevents circular slider/input updates.
 */
export default function GpaTargetSection({ user }: GpaTargetSectionProps) {
  const t = useTranslations("settings");
  const tChips = useTranslations("settings.gpa.bandChips");
  const tCp = useTranslations("settings.gpa.remainingCp");
  const updateProfile = useUpdateProfile();

  const [gpaValue, setGpaValue] = useState(user.gpa_target ?? 75);
  const initialCp = user.remaining_credit_points ?? null;
  const [remainingCp, setRemainingCp] = useState<number | "">(
    initialCp !== null ? initialCp : "",
  );
  const [showSaved, setShowSaved] = useState(false);

  const gradeBand = getGradeBand(gpaValue);
  const bandStyle = BAND_STYLES[gradeBand] ?? BAND_STYLES["\u2014"];

  function handleChange(val: number) {
    const clamped = Math.min(100, Math.max(0, val));
    setGpaValue(clamped);
  }

  function handleCpChange(value: string) {
    if (value === "") {
      setRemainingCp("");
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    // Match backend Field(ge=0, le=500) bounds
    const clamped = Math.min(500, Math.max(0, parsed));
    setRemainingCp(clamped);
  }

  function handleSave() {
    // Single atomic PATCH persists both fields (D-C1 + D-C2).
    //
    // Phase 34 WR-02 fix: flip "Saved!" only on mutation success so the
    // optimistic confirmation never shows for failed PATCHes (e.g. 422).
    updateProfile.mutate(
      {
        gpa_target: gpaValue,
        remaining_credit_points: remainingCp === "" ? null : Number(remainingCp),
      },
      {
        onSuccess: () => {
          setShowSaved(true);
        },
      },
    );
  }

  // Phase 34 WR-02 fix: schedule the "Saved!" auto-dismiss via an effect so
  // the timer is cleaned up on unmount (prevents setting state on an
  // unmounted component when the user navigates away inside the 2s window).
  useEffect(() => {
    if (!showSaved) return;
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [showSaved]);

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

      {/* Phase 34 AIFEAT-03: Band quick-pick chips */}
      <div className="flex flex-wrap items-center gap-[8px] mb-[14px]">
        <span className="text-[0.66rem] text-[#6b6b65] self-center">
          {tChips("label")}:
        </span>
        {BAND_CHIPS.map(({ key, value }) => {
          const active = gpaValue === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleChange(value)}
              className={`py-[6px] px-[12px] text-[0.72rem] font-medium rounded-[6px] border transition-colors ${
                active
                  ? "bg-[#d97757] text-white border-[#d97757]"
                  : "bg-[#faf9f5] text-[#6b6b65] border-[#e8e5dd] hover:border-[#d97757]"
              }`}
            >
              {tChips(key)}
            </button>
          );
        })}
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
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) handleChange(parsed);
          }}
          className="w-[60px] py-[7px] px-[10px] font-serif text-[1rem] font-bold text-center border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,.11)]"
        />
        <button
          type="button"
          onClick={handleSave}
          className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] cursor-pointer transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] whitespace-nowrap bg-[#d97757] text-white border-none hover:bg-[#c5674a] flex items-center gap-[6px]"
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

      {/* Phase 34 AIFEAT-03: Remaining credit points input */}
      <div className="mt-[16px] pt-[16px] border-t border-[#eae7e0]">
        <label className="text-[0.74rem] font-medium text-[#2d2d2a]">
          {tCp("label")}
        </label>
        <p className="text-[0.66rem] text-[#9b9b94] mt-[2px]">
          {tCp("hint")}
        </p>
        <input
          type="number"
          min={0}
          max={500}
          step={6}
          placeholder={tCp("placeholder")}
          value={remainingCp}
          onChange={(e) => handleCpChange(e.target.value)}
          className="mt-[8px] w-full max-w-[220px] px-[12px] py-[8px] text-[0.78rem] border-[1.5px] border-[#e8e5dd] rounded-[6px] bg-[#faf9f5] text-[#2d2d2a] outline-none focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,.11)]"
        />
      </div>
    </div>
  );
}
