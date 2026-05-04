"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";

import {
  useDigestLatest,
  useDigestHistory,
  digestKeys,
} from "@/hooks/use-digest";
import {
  type DigestFilterType,
  FILTER_TYPE_MAP,
  sortCoursesByUrgency,
} from "@/lib/digest/types";

import DigestTitleRow from "@/components/digest/DigestTitleRow";
import DigestFilterBar from "@/components/digest/DigestFilterBar";
import DigestUrgentBanner from "@/components/digest/DigestUrgentBanner";
import CourseSectionCard from "@/components/digest/CourseSectionCard";
import DigestSummaryCard from "@/components/digest/DigestSummaryCard";
import DigestHistoryCard from "@/components/digest/DigestHistoryCard";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

// Enriched fields (name, created_at, urgency_score) from fixture / backend
type EnrichedCourse = {
  code: string;
  name?: string;
  highlights: Array<{
    type: string;
    summary: string;
    summary_zh?: string;
    urgency: string;
    urgency_score?: number;
    source_thread_id?: string;
    source_url?: string;
    created_at?: string;
  }>;
};

/**
 * DigestPage orchestrator.
 * Manages page-level state (filter, selected history, portal),
 * wires all digest components together, and injects right panel content via portal-slot.
 */
export default function DigestPage() {
  const t = useTranslations("digest");
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<DigestFilterType>("all");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // ── Data fetching ──────────────────────────────────────────────
  const {
    data: digestData,
    isLoading,
    isError,
    isFetching,
  } = useDigestLatest();
  const historyQuery = useDigestHistory();

  // ── Portal setup ───────────────────────────────────────────────
  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  // ── Refresh handler ────────────────────────────────────────────
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: digestKeys.latest() });
  };

  // ── Client-side filtering + sorting ────────────────────────────
  const filteredCourses = useMemo(() => {
    if (!digestData?.data?.courses) return [];

    let courses = digestData.data.courses as unknown as EnrichedCourse[];

    // Apply type filter
    if (activeFilter !== "all") {
      const allowedTypes = FILTER_TYPE_MAP[activeFilter] ?? [];
      courses = courses
        .map((course) => ({
          ...course,
          highlights: course.highlights.filter((h) =>
            allowedTypes.includes(h.type)
          ),
        }))
        .filter((course) => course.highlights.length > 0);
    }

    // Sort by urgency then count
    return sortCoursesByUrgency(courses);
  }, [digestData, activeFilter]);

  // ── Summary stats ──────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!digestData?.data?.courses)
      return { updates: 0, courses: 0, grades: 0, urgent: 0 };
    const allHighlights = digestData.data.courses.flatMap((c) => c.highlights);
    return {
      updates: allHighlights.length,
      courses: digestData.data.courses.length,
      grades: allHighlights.filter((h) =>
        FILTER_TYPE_MAP.grade.includes(h.type)
      ).length,
      urgent: allHighlights.filter((h) => h.urgency === "critical").length,
    };
  }, [digestData]);

  // ── History data (unwrap paginated response) ───────────────────
  const historyItems = historyQuery.data?.data ?? [];

  // ── Loading state ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-[18px]">
        <AnimatedEntry delay={1}>
          <div className="h-[40px] bg-[#f6f5f0] rounded-[8px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
        </AnimatedEntry>
        {[1, 2, 3].map((i) => (
          <AnimatedEntry key={i} delay={(i + 1) as 2 | 3 | 4}>
            <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] p-[20px]">
              <div className="h-4 w-40 rounded-[6px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6] mb-4" />
              <div className="h-3 w-full rounded-[6px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6] mb-2" />
              <div className="h-3 w-3/4 rounded-[6px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
            </div>
          </AnimatedEntry>
        ))}
        {portalTarget &&
          createPortal(
            <>
              <AnimatedEntry delay={5}>
                <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] p-[20px] h-[180px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              </AnimatedEntry>
              <AnimatedEntry delay={7}>
                <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] p-[20px] h-[220px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              </AnimatedEntry>
            </>,
            portalTarget
          )}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (isError) {
    return (
      <AnimatedEntry delay={1}>
        <div className="text-center py-[48px] px-[24px] text-[#9b9b94]">
          <Radio
            size={48}
            className="text-[#e8e5dd] mx-auto mb-[16px]"
          />
          <div className="text-[0.88rem] font-medium text-[#2d2d2a] mb-[8px]">
            {t("errorState")}
          </div>
          <button
            onClick={handleRefresh}
            className="text-[0.78rem] font-semibold py-[6px] px-[16px] rounded-[8px] bg-[rgba(217,119,87,0.11)] text-[#d97757] border-none cursor-pointer hover:bg-[rgba(217,119,87,0.18)] transition-colors duration-150"
          >
            {t("retry")}
          </button>
        </div>
      </AnimatedEntry>
    );
  }

  // ── Empty state (after filter or no data) ──────────────────────
  if (filteredCourses.length === 0) {
    return (
      <>
        <DigestTitleRow
          generatedAt={
            digestData?.data?.generated_at ?? new Date().toISOString()
          }
          onRefresh={handleRefresh}
          isFetching={isFetching}
        />
        <DigestFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
        <AnimatedEntry delay={3}>
          <div className="text-center py-[48px] px-[24px] text-[#9b9b94]">
            <Radio
              size={48}
              className="text-[#e8e5dd] mx-auto mb-[16px]"
            />
            <div className="text-[0.88rem] italic">{t("emptyState")}</div>
            <div className="text-[0.78rem] mt-[4px]">
              {t("emptyStateDesc")}
            </div>
          </div>
        </AnimatedEntry>
        {/* Still render right panel for empty state */}
        {portalTarget &&
          createPortal(
            <>
              <DigestSummaryCard
                updates={0}
                courses={0}
                grades={0}
                urgent={0}
              />
              {historyItems.length > 0 && (
                <DigestHistoryCard
                  history={historyItems}
                  selectedId={selectedHistoryId}
                  onSelect={setSelectedHistoryId}
                />
              )}
            </>,
            portalTarget
          )}
      </>
    );
  }

  // ── Main render (normal state with data) ───────────────────────
  return (
    <>
      <div className="flex flex-col gap-[18px]">
        <DigestTitleRow
          generatedAt={digestData!.data.generated_at}
          onRefresh={handleRefresh}
          isFetching={isFetching}
        />
        <DigestFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
        <DigestUrgentBanner criticalCount={summaryStats.urgent} />
        {filteredCourses.map((course, i) => (
          <CourseSectionCard
            key={course.code}
            code={course.code}
            name={course.name}
            highlights={course.highlights}
            delay={Math.min(i + 3, 10)}
          />
        ))}
      </div>
      {portalTarget &&
        createPortal(
          <>
            <DigestSummaryCard
              updates={summaryStats.updates}
              courses={summaryStats.courses}
              grades={summaryStats.grades}
              urgent={summaryStats.urgent}
            />
            {historyItems.length > 0 && (
              <DigestHistoryCard
                history={historyItems}
                selectedId={selectedHistoryId}
                onSelect={setSelectedHistoryId}
              />
            )}
          </>,
          portalTarget
        )}
    </>
  );
}
