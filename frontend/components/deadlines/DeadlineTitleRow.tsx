"use client";

import { useTranslations } from "next-intl";
import { Calendar, CalendarDays, List } from "lucide-react";

type ViewMode = "timeline" | "calendar";
type FilterMode = "all" | "week";

interface DeadlineTitleRowProps {
  upcomingCount: number;
  semester: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  courseOptions: { value: string; label: string }[];
  selectedCourse: string;
  onCourseChange: (courseId: string) => void;
}

export default function DeadlineTitleRow({
  upcomingCount,
  semester,
  viewMode,
  onViewModeChange,
  filterMode,
  onFilterModeChange,
  courseOptions,
  selectedCourse,
  onCourseChange,
}: DeadlineTitleRowProps) {
  const t = useTranslations("deadlines");

  return (
    <div className="flex items-center justify-between p-[0_2px] mb-[8px]">
      {/* Left side: icon + title + semester badge */}
      <div className="flex items-center gap-[10px]">
        <Calendar size={22} className="text-[#d97757] flex-shrink-0" />
        <h1 className="font-serif text-[1.5rem] font-bold text-[#2d2d2a] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <span className="text-[0.68rem] font-semibold py-[3px] px-[10px] rounded-[6px] bg-[rgba(217,119,87,.1)] text-[#d97757]">
          {semester}
        </span>
      </div>

      {/* Right side: filter badge + course dropdown + filter mode + view mode */}
      <div className="flex items-center gap-[8px]">
        {/* Filter count badge */}
        <span className="text-[0.7rem] font-semibold text-[#6b6b65] bg-[#f6f5f0] border border-[#e8e5dd] px-[10px] py-[4px] rounded-[6px]">
          {t("filterBadge", { count: String(upcomingCount) })}
        </span>

        {/* Course filter dropdown */}
        <select
          className="text-[0.72rem] font-semibold text-[#6b6b65] bg-[#f6f5f0] border border-[#e8e5dd] px-[10px] py-[4px] rounded-[6px] outline-none cursor-pointer"
          value={selectedCourse}
          onChange={(e) => onCourseChange(e.target.value)}
          data-testid="course-filter"
        >
          <option value="">{t("filterCourse")}</option>
          {courseOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* All / This Week toggle */}
        <div className="flex border border-[#e8e5dd] rounded-[8px] overflow-hidden">
          <button
            className={`text-[0.72rem] font-semibold px-3 py-[5px] border-none border-r border-[#e8e5dd] transition-colors duration-150 ${
              filterMode === "all"
                ? "bg-[rgba(217,119,87,.1)] text-[#d97757]"
                : "bg-white text-[#9b9b94]"
            }`}
            style={{ borderRight: "1px solid #e8e5dd" }}
            onClick={() => onFilterModeChange("all")}
            data-testid="mode-all"
          >
            {t("modeAll")}
          </button>
          <button
            className={`text-[0.72rem] font-semibold px-3 py-[5px] border-none transition-colors duration-150 ${
              filterMode === "week"
                ? "bg-[rgba(217,119,87,.1)] text-[#d97757]"
                : "bg-white text-[#9b9b94]"
            }`}
            onClick={() => onFilterModeChange("week")}
            data-testid="mode-week"
          >
            {t("modeWeek")}
          </button>
        </div>

        {/* Timeline / Calendar toggle */}
        <div className="flex border border-[#e8e5dd] rounded-[8px] overflow-hidden">
          <button
            className={`text-[0.72rem] font-semibold px-3 py-[5px] border-none transition-colors duration-150 grid place-items-center ${
              viewMode === "timeline"
                ? "bg-[rgba(217,119,87,.1)] text-[#d97757]"
                : "bg-white text-[#9b9b94]"
            }`}
            style={{ borderRight: "1px solid #e8e5dd" }}
            onClick={() => onViewModeChange("timeline")}
            data-testid="view-timeline"
          >
            <List size={14} />
          </button>
          <button
            className={`text-[0.72rem] font-semibold px-3 py-[5px] border-none transition-colors duration-150 grid place-items-center ${
              viewMode === "calendar"
                ? "bg-[rgba(217,119,87,.1)] text-[#d97757]"
                : "bg-white text-[#9b9b94]"
            }`}
            onClick={() => onViewModeChange("calendar")}
            data-testid="view-calendar"
          >
            <CalendarDays size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
