"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { DeadlineResponse } from "@/lib/api/types";

export interface DeadlineFilterState {
  course_code?: string;
  urgency?: string;
  include_past?: boolean;
}

interface DeadlineFiltersProps {
  deadlines: DeadlineResponse[];
  filters: DeadlineFilterState;
  onFilterChange: (filters: DeadlineFilterState) => void;
}

const URGENCY_OPTIONS = [
  { value: "", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "warning", label: "Warning" },
  { value: "normal", label: "Normal" },
];

/**
 * Horizontal filter bar for the deadlines page.
 * Allows filtering by course, urgency level, and past deadline visibility.
 */
export default function DeadlineFilters({
  deadlines,
  filters,
  onFilterChange,
}: DeadlineFiltersProps) {
  // Extract unique course codes from deadlines
  const courseCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const d of deadlines) {
      codes.add(d.course_code);
    }
    return Array.from(codes).sort();
  }, [deadlines]);

  // Active filter tags
  const activeTags: { key: string; label: string }[] = [];
  if (filters.course_code) {
    activeTags.push({
      key: "course_code",
      label: filters.course_code,
    });
  }
  if (filters.urgency) {
    activeTags.push({ key: "urgency", label: filters.urgency });
  }
  if (filters.include_past) {
    activeTags.push({ key: "include_past", label: "Past included" });
  }

  function removeFilter(key: string) {
    const updated = { ...filters };
    if (key === "course_code") updated.course_code = undefined;
    if (key === "urgency") updated.urgency = undefined;
    if (key === "include_past") updated.include_past = undefined;
    onFilterChange(updated);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {/* Course filter */}
        <select
          value={filters.course_code ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              course_code: e.target.value || undefined,
            })
          }
          className="text-xs rounded px-2 py-1.5 border"
          style={{
            borderColor: "var(--color-card-border)",
            backgroundColor: "var(--color-card-bg)",
            color: "var(--color-text-2)",
          }}
        >
          <option value="">All Courses</option>
          {courseCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        {/* Urgency filter buttons */}
        <div className="flex gap-1">
          {URGENCY_OPTIONS.map((opt) => {
            const isActive =
              (opt.value === "" && !filters.urgency) ||
              filters.urgency === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    urgency: opt.value || undefined,
                  })
                }
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  isActive ? "font-medium" : ""
                }`}
                style={{
                  backgroundColor: isActive
                    ? "var(--color-orange-soft)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-orange)"
                    : "var(--color-text-2)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Show past toggle */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={filters.include_past ?? false}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                include_past: e.target.checked || undefined,
              })
            }
            className="rounded"
            style={{ accentColor: "var(--color-orange)" }}
          />
          <span style={{ color: "var(--color-text-2)" }}>
            Show past deadlines
          </span>
        </label>
      </div>

      {/* Active filter tags */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeTags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium"
              style={{
                backgroundColor: "var(--color-orange-soft)",
                color: "var(--color-orange)",
              }}
            >
              {tag.label}
              <button
                onClick={() => removeFilter(tag.key)}
                className="hover:opacity-70"
                aria-label={`Remove ${tag.label} filter`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
