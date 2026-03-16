"use client";

import { isSameDay, parseISO } from "date-fns";
import { X } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { formatDeadline, formatRelative } from "@/lib/utils/dates";
import type { DeadlineResponse } from "@/lib/api/types";

interface DeadlineListProps {
  deadlines: DeadlineResponse[];
  selectedDate: Date | null;
  onClearDate?: () => void;
}

/** Map urgency to left border color */
function urgencyBorderColor(urgency: DeadlineResponse["urgency"]): string {
  switch (urgency) {
    case "urgent":
      return "#c0392b";
    case "warning":
      return "var(--color-amber)";
    case "past_due":
      return "var(--color-text-3)";
    case "normal":
    default:
      return "var(--color-divider)";
  }
}

/**
 * Vertical list of deadline cards with urgency color coding.
 * Supports filtering by selectedDate.
 */
export default function DeadlineList({
  deadlines,
  selectedDate,
  onClearDate,
}: DeadlineListProps) {
  // Filter by selected date if active
  const filtered = selectedDate
    ? deadlines.filter((d) => isSameDay(parseISO(d.due_date), selectedDate))
    : deadlines;

  // Sort by due_date ascending
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="space-y-3">
      {/* Date filter header */}
      {selectedDate && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded text-sm"
          style={{
            backgroundColor: "var(--color-orange-soft)",
            color: "var(--color-text-1)",
          }}
        >
          <span>
            Showing deadlines for{" "}
            <strong>{formatDeadline(selectedDate.toISOString())}</strong>
          </span>
          {onClearDate && (
            <button
              onClick={onClearDate}
              className="p-0.5 rounded hover:bg-[var(--color-card-bg-hover)] transition-colors"
              aria-label="Clear date filter"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Deadline cards */}
      {sorted.length === 0 ? (
        <p style={{ color: "var(--color-text-3)" }}>
          No deadlines{selectedDate ? " for this date" : ""}.
        </p>
      ) : (
        sorted.map((d) => (
          <RoughCard
            key={d.id}
            className="p-4 bg-[var(--color-card-bg)]"
            style={{
              borderLeft: `3px solid ${urgencyBorderColor(d.urgency)}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Course badge */}
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium mb-1.5"
                  style={{
                    backgroundColor: "var(--color-blue-soft)",
                    color: "var(--color-blue)",
                  }}
                >
                  {d.course_code}
                </span>

                {/* Title */}
                <h4
                  className="text-sm font-medium mb-1"
                  style={{ color: "var(--color-text-1)" }}
                >
                  {d.title}
                </h4>

                {/* Date + relative time */}
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-2)" }}
                >
                  {formatDeadline(d.due_date)} &middot;{" "}
                  <span style={{ color: urgencyBorderColor(d.urgency) }}>
                    {formatRelative(d.due_date)}
                  </span>
                </p>
              </div>

              {/* Right side: weight and source tags */}
              <div className="flex flex-col items-end gap-1">
                {d.weight !== null && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-2)" }}
                  >
                    {(d.weight * 100).toFixed(0)}% weight
                  </span>
                )}
                <div className="flex gap-1">
                  {d.source_tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1 py-0.5 rounded uppercase"
                      style={{
                        backgroundColor: "var(--color-amber-soft)",
                        color: "var(--color-amber)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </RoughCard>
        ))
      )}
    </div>
  );
}
