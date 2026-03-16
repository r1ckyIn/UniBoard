"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import clsx from "clsx";

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface RoughDonutProps {
  segments: DonutSegment[];
  /** Diameter in pixels (default 180). */
  size?: number;
  className?: string;
}

/**
 * SVG-based hand-drawn donut chart using Rough.js arc().
 */
export default function RoughDonut({
  segments,
  size = 180,
  className,
}: RoughDonutProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevHash = useRef("");

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Skip if segments haven't changed
    const hash = JSON.stringify(segments);
    if (hash === prevHash.current) return;
    prevHash.current = hash;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return;

    const rc = rough.svg(svg);
    let startAngle = -Math.PI / 2;

    for (const seg of segments) {
      const sweep = (seg.value / total) * Math.PI * 2;
      const endAngle = startAngle + sweep;

      if (sweep > 0.01) {
        const node = rc.arc(cx, cy, radius * 2, radius * 2, startAngle, endAngle, false, {
          stroke: seg.color,
          strokeWidth: 12,
          roughness: 0.8,
          fill: "none",
        });
        svg.appendChild(node);
      }

      startAngle = endAngle;
    }
  }, [segments, size]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  return (
    <div className={clsx("relative", className)} style={{ width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      />
    </div>
  );
}
