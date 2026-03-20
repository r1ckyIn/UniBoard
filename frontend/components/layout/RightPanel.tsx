"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Activity, ChevronLeft, ChevronRight, Star, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

// Load RoughCard client-only to avoid SSR hydration mismatches
const RoughCard = withClientOnly(
  () => import("@/components/design-system/RoughCard")
);

// Calendar helpers
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0 = Sunday, convert to Monday-based (0 = Monday)
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Placeholder deadline days (static for Phase 1)
const DEADLINE_DAYS = [12, 19, 25];

export default function RightPanel() {
  const t = useTranslations("rightPanel");
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide scrollbar: add 'scrolling' class on scroll, remove after 1200ms
  const handleScroll = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.classList.add("scrolling");
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      panel.classList.remove("scrolling");
    }, 1200);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.addEventListener("scroll", handleScroll);
    return () => {
      panel.removeEventListener("scroll", handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [handleScroll]);

  // Current date for calendar
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Build calendar grid
  const calendarCells: { day: number; muted: boolean }[] = [];
  // Previous month padding
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarCells.push({ day: prevMonthDays - i, muted: true });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, muted: false });
  }
  // Next month padding
  const remaining = 7 - (calendarCells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      calendarCells.push({ day: d, muted: true });
    }
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "w-[var(--spacing-right-panel-w)] flex-shrink-0",
        "hidden xl:flex xl:flex-col",
        "gap-[18px] sticky top-[calc(var(--spacing-header-h)+28px)]",
        "self-start max-h-[calc(100vh-var(--spacing-header-h)-56px)]",
        "overflow-y-auto overflow-x-hidden",
        // Auto-hide scrollbar styles
        "[&::-webkit-scrollbar-thumb]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:transition-[background]",
        "[&::-webkit-scrollbar-thumb]:duration-300",
        "[&.scrolling::-webkit-scrollbar-thumb]:bg-card-border"
      )}
    >
      {/* Profile Card */}
      <AnimatedEntry delay={8}>
        <RoughCard className="text-center" padding="py-6 px-5">
          <div className="w-[54px] h-[54px] rounded-card bg-gradient-to-br from-orange to-[#e8956e] grid place-items-center text-white font-serif font-bold text-[22px] mx-auto mb-3 shadow-[0_2px_10px_rgba(217,119,87,.25)]">
            R
          </div>
          <div className="font-serif text-[1.02rem] font-semibold mb-[2px]">
            Ricky Qin
          </div>
          <div className="text-[0.76rem] text-text-3">CS Year 3</div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-[rgba(250,249,245,.55)] border border-card-border rounded-sm py-[10px] px-[6px]">
              <div className="font-serif text-[1.12rem] font-bold">4</div>
              <div className="text-[0.66rem] text-text-3 uppercase tracking-[0.04em]">
                {t("courses")}
              </div>
            </div>
            <div className="bg-[rgba(250,249,245,.55)] border border-card-border rounded-sm py-[10px] px-[6px]">
              <div className="font-serif text-[1.12rem] font-bold">24</div>
              <div className="text-[0.66rem] text-text-3 uppercase tracking-[0.04em]">
                {t("creditPts")}
              </div>
            </div>
          </div>
        </RoughCard>
      </AnimatedEntry>

      {/* Calendar Card */}
      <AnimatedEntry delay={9}>
        <RoughCard padding="py-4 px-[18px]">
          <div className="flex items-center justify-between mb-[10px]">
            <button className="bg-transparent border-none cursor-pointer text-text-3 p-1 rounded-[6px] transition-all duration-[0.15s] hover:bg-card-bg-hover hover:text-text-1 grid place-items-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-serif font-semibold text-[0.88rem]">
              {MONTH_NAMES[month]} {year}
            </div>
            <button className="bg-transparent border-none cursor-pointer text-text-3 p-1 rounded-[6px] transition-all duration-[0.15s] hover:bg-card-bg-hover hover:text-text-1 grid place-items-center">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-px text-center">
            {/* Day headers */}
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="text-[0.62rem] font-semibold text-text-3 py-1 uppercase"
              >
                {d}
              </div>
            ))}
            {/* Day cells */}
            {calendarCells.map((cell, i) => {
              const isToday = !cell.muted && cell.day === today;
              const hasDeadline = !cell.muted && DEADLINE_DAYS.includes(cell.day);
              return (
                <div
                  key={i}
                  className={cn(
                    "text-[0.74rem] py-[5px] rounded-[6px] text-text-2",
                    cell.muted && "text-text-3 opacity-35",
                    isToday && "bg-orange text-white font-semibold",
                    hasDeadline && !isToday && "bg-orange-soft text-orange font-semibold"
                  )}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </RoughCard>
      </AnimatedEntry>

      {/* Activity Card */}
      <AnimatedEntry delay={10}>
        <RoughCard padding="p-[18px]">
          <div className="flex items-center gap-2 text-[0.95rem] font-semibold mb-[14px]">
            <Activity className="w-4 h-4 text-orange" />
            {t("recentActivity")}
          </div>
          <div className="flex flex-col gap-[14px]">
            {/* Grade activity */}
            <div className="flex gap-[10px] items-start">
              <div className="w-[30px] h-[30px] rounded-sm bg-green-soft text-green grid place-items-center flex-shrink-0">
                <Star className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[0.76rem] text-text-2 leading-[1.4]">
                  <strong className="text-text-1 font-semibold">Quiz 3</strong> graded: 92%
                </div>
                <div className="text-[0.66rem] text-text-3 mt-px">3h ago</div>
              </div>
            </div>
            {/* Discussion activity */}
            <div className="flex gap-[10px] items-start">
              <div className="w-[30px] h-[30px] rounded-sm bg-blue-soft text-blue grid place-items-center flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[0.76rem] text-text-2 leading-[1.4]">
                  Staff reply in <strong className="text-text-1 font-semibold">COMP2017</strong>
                </div>
                <div className="text-[0.66rem] text-text-3 mt-px">5h ago</div>
              </div>
            </div>
            {/* Deadline activity */}
            <div className="flex gap-[10px] items-start">
              <div className="w-[30px] h-[30px] rounded-sm bg-orange-soft text-orange grid place-items-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[0.76rem] text-text-2 leading-[1.4]">
                  <strong className="text-text-1 font-semibold">Lab 5</strong> due in 3 days
                </div>
                <div className="text-[0.66rem] text-text-3 mt-px">Today</div>
              </div>
            </div>
          </div>
        </RoughCard>
      </AnimatedEntry>
    </div>
  );
}
