"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import clsx from "clsx";

interface TimelineItem {
  date: string;
  label: string;
  color: string;
}

interface RoughTimelineProps {
  items: TimelineItem[];
  className?: string;
}

/**
 * Vertical timeline with a hand-drawn line and dot markers at each point.
 */
export default function RoughTimeline({
  items,
  className,
}: RoughTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (items.length === 0) return;

    const rc = rough.svg(svg);
    const lineX = 16;
    const startY = 16;
    const gap = 56;
    const totalH = startY + (items.length - 1) * gap + 16;
    svg.setAttribute("height", String(totalH));

    // Vertical line
    if (items.length > 1) {
      const lineNode = rc.line(lineX, startY, lineX, startY + (items.length - 1) * gap, {
        stroke: "#e8e5dd",
        strokeWidth: 1.2,
        roughness: 1.0,
      });
      svg.appendChild(lineNode);
    }

    // Dots at each point
    items.forEach((item, i) => {
      const y = startY + i * gap;
      const dot = rc.circle(lineX, y, 10, {
        stroke: item.color,
        strokeWidth: 1.5,
        fill: item.color,
        fillStyle: "solid",
        roughness: 0.8,
      });
      svg.appendChild(dot);
    });
  }, [items]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  return (
    <div className={clsx("flex", className)}>
      <svg ref={svgRef} width={32} style={{ overflow: "visible", flexShrink: 0 }} />
      <div className="flex flex-col" style={{ gap: "32px", paddingTop: "6px" }}>
        {items.map((item, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
              {item.date}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
