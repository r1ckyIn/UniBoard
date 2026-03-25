"use client";

import { useTranslations } from "next-intl";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { WeekMode } from "@/lib/timetable/types";
import { cn } from "@/lib/utils/cn";

interface TimetableTitleRowProps {
  weekPosition: number;
  weekLabel: string;
  dateRange: string;
  mode: WeekMode;
  onWeekChange: (pos: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onModeChange: (mode: WeekMode) => void;
}

/**
 * Title bar for the Timetable page.
 * Left: Calendar icon + heading + semester badge
 * Center: week slider (1-14)
 * Right: prev/next nav + date range + mode toggle (All / Current)
 */
export default function TimetableTitleRow({
  weekPosition,
  weekLabel,
  dateRange,
  mode,
  onWeekChange,
  onPrev,
  onNext,
  onModeChange,
}: TimetableTitleRowProps) {
  const t = useTranslations("timetable");

  // Compute slider background fill percentage
  const fillPct = ((weekPosition - 1) / 13) * 100;

  return (
    <div className="flex items-center justify-between px-[2px] mb-[8px]">
      {/* Left group: icon + heading + badge */}
      <div className="flex items-center gap-[10px]">
        <Calendar size={22} className="text-[#d97757] flex-shrink-0" />
        <h1 className="font-serif text-[1.5rem] font-bold text-[#2d2d2a] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <span className="text-[0.68rem] font-semibold px-[10px] py-[3px] rounded-[6px] bg-[rgba(217,119,87,0.11)] text-[#d97757]">
          {t("semesterBadge")}
        </span>
      </div>

      {/* Center group: slider */}
      <div className="flex flex-col items-center gap-[1px]">
        <span className="font-serif text-[0.64rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
          {t("sliderLabel")}
        </span>
        <input
          type="range"
          className={cn(
            "w-[200px] h-[5px] appearance-none rounded-[3px] outline-none cursor-pointer m-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:h-[16px] [&::-webkit-slider-thumb]:bg-[#d97757] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_1px_5px_rgba(0,0,0,0.18)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-[16px] [&::-moz-range-thumb]:h-[16px] [&::-moz-range-thumb]:bg-[#d97757] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0_1px_5px_rgba(0,0,0,0.18)] [&::-moz-range-thumb]:cursor-pointer",
            mode === "all" && "opacity-50 pointer-events-none"
          )}
          style={{
            background: `linear-gradient(to right, #d97757 0%, #d97757 ${fillPct}%, #eae7e0 ${fillPct}%, #eae7e0 100%)`,
          }}
          min={1}
          max={14}
          step={1}
          value={weekPosition}
          disabled={mode === "all"}
          onChange={(e) => onWeekChange(parseInt(e.target.value, 10))}
        />
      </div>

      {/* Right group: nav buttons + date range + mode toggle */}
      <div className="flex items-center gap-[8px]">
        {/* Prev button */}
        <button
          className={cn(
            "w-[30px] h-[30px] rounded-[8px] border border-[#e8e5dd] bg-[#f6f5f0] grid place-items-center cursor-pointer text-[#6b6b65] transition-all duration-150 hover:bg-[#efede6] hover:text-[#2d2d2a]",
            weekPosition <= 1 && "opacity-40 cursor-default pointer-events-none"
          )}
          disabled={weekPosition <= 1 || mode === "all"}
          onClick={onPrev}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Week dates */}
        <span className="font-serif font-semibold text-[0.86rem] min-w-[180px] text-center text-[#2d2d2a]">
          {dateRange}
        </span>

        {/* Next button */}
        <button
          className={cn(
            "w-[30px] h-[30px] rounded-[8px] border border-[#e8e5dd] bg-[#f6f5f0] grid place-items-center cursor-pointer text-[#6b6b65] transition-all duration-150 hover:bg-[#efede6] hover:text-[#2d2d2a]",
            weekPosition >= 14 && "opacity-40 cursor-default pointer-events-none"
          )}
          disabled={weekPosition >= 14 || mode === "all"}
          onClick={onNext}
        >
          <ChevronRight size={15} />
        </button>

        {/* Mode toggle */}
        <div className="flex border border-[#e8e5dd] rounded-[8px] overflow-hidden">
          <button
            className={cn(
              "text-[0.72rem] font-semibold px-[12px] py-[5px] border-r border-[#e8e5dd] cursor-pointer transition-all duration-150 whitespace-nowrap",
              mode === "all"
                ? "bg-[rgba(217,119,87,0.11)] text-[#d97757]"
                : "bg-white text-[#9b9b94] hover:text-[#2d2d2a] hover:bg-[#efede6]"
            )}
            onClick={() => onModeChange("all")}
          >
            {t("modeAll")}
          </button>
          <button
            className={cn(
              "text-[0.72rem] font-semibold px-[12px] py-[5px] cursor-pointer transition-all duration-150 whitespace-nowrap",
              mode === "week"
                ? "bg-[rgba(217,119,87,0.11)] text-[#d97757]"
                : "bg-white text-[#9b9b94] hover:text-[#2d2d2a] hover:bg-[#efede6]"
            )}
            onClick={() => onModeChange("week")}
          >
            {t("modeCurrent")}
          </button>
        </div>
      </div>
    </div>
  );
}
