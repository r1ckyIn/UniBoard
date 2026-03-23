"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
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

/**
 * Rough.js dot rendered alongside each deadline card.
 * Wrapped with withClientOnly for SSR safety.
 */
function RoughDot({
  color,
  filled,
}: {
  color: string;
  filled: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const circle = rc.circle(10, 10, 10, {
      stroke: color,
      strokeWidth: 1.2,
      roughness: 1.5,
      fill: filled ? color : "none",
      fillStyle: "solid",
      seed: 42,
    });
    svg.appendChild(circle);
  }, [color, filled]);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      draw();
    });
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  return (
    <svg
      ref={svgRef}
      className="absolute left-[-30px] top-[16px] w-[20px] h-[20px] pointer-events-none overflow-visible"
    />
  );
}

// SSR-safe wrapper for the Rough.js dot
const ClientRoughDot = withClientOnly(
  () => Promise.resolve({ default: RoughDot })
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
        // Cap delay at 6 (max useful value in AnimatedEntry DELAY_MAP)
        const delay = Math.min(index + 2, 6) as 1 | 2 | 3 | 4 | 5 | 6;

        return (
          <AnimatedEntry key={dl.id} delay={delay}>
            <div className="relative">
              {/* Rough.js dot */}
              <ClientRoughDot
                color={dotColor}
                filled={index === 0}
              />
              {/* Card */}
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
