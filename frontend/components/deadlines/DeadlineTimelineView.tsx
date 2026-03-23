"use client";

import { differenceInCalendarDays } from "date-fns";
import { getUrgency, URGENCY_COLORS } from "@/lib/deadlines/urgency";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import DeadlineCard from "@/components/deadlines/DeadlineCard";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import type { components } from "@/lib/api/types.gen";

type Deadline = components["schemas"]["Deadline"];

interface DeadlineTimelineViewProps {
  deadlines: Deadline[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

// SSR-safe wrapper — real dynamic import for proper code-splitting
const ClientRoughDot = withClientOnly(
  () => import("@/components/deadlines/RoughDot")
);

export default function DeadlineTimelineView({
  deadlines,
  expandedId,
  onToggleExpand,
}: DeadlineTimelineViewProps) {
  return (
    <div className="relative pl-[30px] flex flex-col gap-[14px] min-h-[200px] before:content-[''] before:absolute before:left-[9px] before:top-[24px] before:bottom-[24px] before:w-[2px] before:bg-[#d5d2ca] before:rounded-[1px]">
      {deadlines.map((dl, index) => {
        const daysRemaining = differenceInCalendarDays(
          new Date(dl.due_date),
          new Date()
        );
        const urgency = getUrgency(daysRemaining);
        const dotColor = URGENCY_COLORS[urgency].dot;
        const courseColor = getCourseColor(dl.course_code);
        const delay = Math.min(index + 2, 6) as 1 | 2 | 3 | 4 | 5 | 6;

        return (
          <AnimatedEntry key={dl.id} delay={delay}>
            <div className="relative">
              <ClientRoughDot
                color={dotColor}
                filled={index === 0}
              />
              <DeadlineCard
                deadline={dl}
                isExpanded={expandedId === dl.id}
                onToggle={() => onToggleExpand(dl.id)}
                courseColor={courseColor}
              />
            </div>
          </AnimatedEntry>
        );
      })}
    </div>
  );
}
