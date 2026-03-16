"use client";

import RoughCard from "@/components/design-system/RoughCard";
import RoughTimeline from "@/components/design-system/RoughTimeline";
import { formatRelative, formatDeadline } from "@/lib/utils/dates";
import type { DeadlineResponse } from "@/lib/api/types";

interface DeadlineTimelineProps {
  deadlines: DeadlineResponse[];
  isLoading: boolean;
}

/** Map urgency level to display color */
function urgencyColor(urgency: DeadlineResponse["urgency"]): string {
  switch (urgency) {
    case "urgent":
      return "#c0392b";
    case "warning":
      return "var(--color-amber)";
    case "past_due":
      return "var(--color-text-3)";
    case "normal":
    default:
      return "var(--color-text-2)";
  }
}

/**
 * Shows the next 7 upcoming deadlines in a vertical timeline.
 * Sorted by due_date ascending with urgency color coding.
 */
export default function DeadlineTimeline({
  deadlines,
  isLoading,
}: DeadlineTimelineProps) {
  if (isLoading) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3
          className="text-lg mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Upcoming Deadlines
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-[var(--color-divider)] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  // Sort by date and take first 7
  const upcoming = [...deadlines]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .filter((d) => d.urgency !== "past_due")
    .slice(0, 7);

  const timelineItems = upcoming.map((d) => ({
    date: formatDeadline(d.due_date),
    label: `${d.course_code}: ${d.title}`,
    color: urgencyColor(d.urgency),
  }));

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Upcoming Deadlines
      </h3>

      {upcoming.length === 0 ? (
        <p style={{ color: "var(--color-text-3)" }}>
          No upcoming deadlines. Enjoy the calm!
        </p>
      ) : (
        <div className="space-y-1">
          <RoughTimeline items={timelineItems} />
          {/* Relative time annotations */}
          <div className="pl-10 mt-2 space-y-[32px] pt-[6px]">
            {upcoming.map((d) => (
              <p
                key={d.id}
                className="text-xs"
                style={{ color: urgencyColor(d.urgency) }}
              >
                {formatRelative(d.due_date)}
              </p>
            ))}
          </div>
        </div>
      )}
    </RoughCard>
  );
}
