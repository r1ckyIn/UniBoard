"use client";

import { useState } from "react";
import RoughCard from "@/components/design-system/RoughCard";
import RoughDonut from "@/components/design-system/RoughDonut";
import { useGPACourseDetail } from "@/lib/hooks/useGPA";
import type { CourseSummary } from "@/lib/api/types";

interface WeightDonutProps {
  courses: CourseSummary[];
}

// Rotating palette for assessment groups
const GROUP_COLORS = [
  "#d97757", // orange
  "#6a9bcc", // blue
  "#788c5d", // green
  "#b08968", // amber
  "#9b7bb8", // purple
  "#c96b7a", // rose
];

/**
 * Assessment weight donut chart for a selected course.
 * Groups assessments by group_name and shows total weight per group.
 */
export default function WeightDonut({ courses }: WeightDonutProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(
    courses[0]?.course_id ?? ""
  );

  const { data: detail, isLoading } = useGPACourseDetail(selectedCourseId);

  // Build donut segments from assessment groups
  const segments = (() => {
    if (!detail?.assessments) return [];

    const groups = new Map<string, number>();
    for (const a of detail.assessments) {
      const existing = groups.get(a.group_name) ?? 0;
      groups.set(a.group_name, existing + a.weight);
    }

    let colorIndex = 0;
    return Array.from(groups.entries()).map(([label, value]) => ({
      label,
      value: value * 100,
      color: GROUP_COLORS[colorIndex++ % GROUP_COLORS.length],
    }));
  })();

  const selectedCode =
    courses.find((c) => c.course_id === selectedCourseId)?.course_code ?? "Weights";

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Weights
        </h3>
        {courses.length > 1 && (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="text-xs rounded px-2 py-1 border"
            style={{
              borderColor: "var(--color-card-border)",
              backgroundColor: "var(--color-card-bg)",
              color: "var(--color-text-2)",
            }}
          >
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_code}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading || segments.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <div
            className="w-[180px] h-[180px] rounded-full animate-pulse"
            style={{ backgroundColor: "var(--color-divider)" }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* Donut chart */}
          <div className="relative">
            <RoughDonut segments={segments} size={180} />
            {/* Center label */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ pointerEvents: "none" }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-text-2)" }}
              >
                {selectedCode}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-2)" }}
                >
                  {seg.label} ({seg.value.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </RoughCard>
  );
}
