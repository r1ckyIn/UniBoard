"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import rough from "roughjs";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import RoughCard from "@/components/design-system/RoughCard";

export interface DeadlineItem {
  id: string;
  title: string;
  course_code: string;
  days_remaining: number;
  weight: number;
  urgency: "urgent" | "soon" | "later";
}

interface DeadlineTimelineProps {
  deadlines: DeadlineItem[];
  selectedDeadlineId: string | null;
  onDeadlineClick: (id: string) => void;
  onSeeDetails: (id: string) => void;
}

// Urgency color mapping
const URGENCY_COLORS: Record<
  DeadlineItem["urgency"],
  { dot: string; bg: string; selectedBg: string; softBg: string }
> = {
  urgent: {
    dot: "#d97757",
    bg: "rgba(217,119,87,.05)",
    selectedBg: "rgba(217,119,87,.12)",
    softBg: "rgba(217,119,87,.11)",
  },
  soon: {
    dot: "#6a9bcc",
    bg: "rgba(106,155,204,.05)",
    selectedBg: "rgba(106,155,204,.12)",
    softBg: "rgba(106,155,204,.11)",
  },
  later: {
    dot: "#788c5d",
    bg: "rgba(120,140,93,.05)",
    selectedBg: "rgba(120,140,93,.12)",
    softBg: "rgba(120,140,93,.11)",
  },
};

export default function DeadlineTimeline({
  deadlines,
  selectedDeadlineId,
  onDeadlineClick,
  onSeeDetails,
}: DeadlineTimelineProps) {
  const t = useTranslations("dashboard");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw the Rough.js vertical timeline line
  const drawTimeline = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    // Find all item elements to determine positions
    const items = container.querySelectorAll("[data-timeline-item]");
    if (items.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const firstItem = items[0] as HTMLElement;
    const lastItem = items[items.length - 1] as HTMLElement;
    const firstRect = firstItem.getBoundingClientRect();
    const lastRect = lastItem.getBoundingClientRect();

    // Vertical center of first and last items relative to container
    const startY = firstRect.top - containerRect.top + firstRect.height / 2;
    const endY = lastRect.top - containerRect.top + lastRect.height / 2;

    const svgHeight = container.offsetHeight;
    svg.setAttribute("viewBox", `0 0 20 ${svgHeight}`);
    svg.style.height = `${svgHeight}px`;

    // Clear previous drawing
    svg.replaceChildren();

    const rc = rough.svg(svg);

    // Draw vertical line
    const line = rc.line(10, startY, 10, endY, {
      stroke: "#d5d2ca",
      strokeWidth: 1.2,
      roughness: 1.5,
      seed: 42,
    });
    svg.appendChild(line);

    // Draw dots for each item
    items.forEach((item, idx) => {
      const itemEl = item as HTMLElement;
      const itemRect = itemEl.getBoundingClientRect();
      const cy = itemRect.top - containerRect.top + itemRect.height / 2;
      const urgency = itemEl.dataset.urgency as DeadlineItem["urgency"];
      const color = URGENCY_COLORS[urgency]?.dot ?? "#9b9b94";

      const circle = rc.circle(10, cy, 10, {
        stroke: color,
        strokeWidth: 1.2,
        roughness: 1.5,
        fill: idx === 0 ? color : "none",
        fillStyle: "solid",
        seed: 42 + idx,
      });
      svg.appendChild(circle);
    });
  }, []);

  useEffect(() => {
    // Double rAF to ensure layout is stable
    let innerRafId: number;
    const outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        drawTimeline();
      });
    });

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
    };
  }, [drawTimeline, deadlines, selectedDeadlineId]);

  return (
    <RoughCard>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-orange" strokeWidth={2} />
          <h2
            className="font-serif text-text-1"
            style={{ fontSize: "0.95rem", fontWeight: 600 }}
          >
            {t("deadlines.title")}
          </h2>
        </div>
        <span
          className="rounded"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            padding: "1px 8px",
            borderRadius: "4px",
            backgroundColor: "var(--color-orange-soft)",
            color: "var(--color-orange)",
          }}
        >
          {t("deadlines.badge")}
        </span>
      </div>

      {/* Timeline container with SVG overlay */}
      <div className="relative pl-7">
        {/* SVG timeline line + dots */}
        <svg
          ref={svgRef}
          className="absolute left-0 top-0 w-5 pointer-events-none"
          style={{ overflow: "visible" }}
        />

        {/* Timeline items */}
        <div ref={containerRef} className="flex flex-col">
          {deadlines.map((dl) => {
            const colors = URGENCY_COLORS[dl.urgency];
            const isSelected = selectedDeadlineId === dl.id;

            return (
              <div
                key={dl.id}
                data-timeline-item
                data-urgency={dl.urgency}
                role="button"
                tabIndex={0}
                aria-label={`${dl.title} — ${dl.course_code}, ${dl.days_remaining} days remaining`}
                onClick={() => onDeadlineClick(dl.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDeadlineClick(dl.id);
                  }
                }}
                className={cn(
                  "group py-3 px-4 mb-3 rounded-sm cursor-pointer",
                  "transition-transform duration-150 ease-out",
                  "hover:translate-x-1"
                )}
                style={{
                  backgroundColor: isSelected
                    ? colors.selectedBg
                    : colors.bg,
                }}
              >
                <div className="flex items-center justify-between">
                  {/* Left: name + course code */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-text-1 truncate"
                      style={{ fontSize: "12px", fontWeight: 600 }}
                    >
                      {dl.title}
                    </div>
                    <div
                      className="text-text-3"
                      style={{ fontSize: "12px" }}
                    >
                      {dl.course_code}
                    </div>
                  </div>

                  {/* Right: see details + days badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* See details link — visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeeDetails(dl.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-transparent border-none cursor-pointer"
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-orange)",
                        transition: "opacity 0.4s ease",
                      }}
                    >
                      {t("deadlines.seeDetails")}
                    </button>

                    {/* Days badge */}
                    <span
                      className="rounded whitespace-nowrap"
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: colors.softBg,
                        color: colors.dot,
                      }}
                    >
                      {t("deadlines.days", { count: dl.days_remaining })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RoughCard>
  );
}
