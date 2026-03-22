"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";

interface RoughProgressBarProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Fill and stroke color for the filled portion */
  color: string;
  /** SVG width in pixels (default: 120) */
  width?: number;
  /** SVG height in pixels (default: 14) */
  height?: number;
}

export default function RoughProgressBar({
  progress,
  color,
  width = 120,
  height = 14,
}: RoughProgressBarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous SVG children before redraw
    svg.replaceChildren();

    const rc = rough.svg(svg);

    // Background track
    const track = rc.rectangle(0, 0, width, height, {
      stroke: "#d5d2ca",
      fill: "#eae7e0",
      fillStyle: "solid",
      roughness: 1.2,
      seed: 42,
    });
    svg.appendChild(track);

    // Filled portion (only render if progress > 0)
    if (progress > 0) {
      const fillWidth = width * Math.min(progress, 1);
      const filled = rc.rectangle(0, 0, fillWidth, height, {
        stroke: color,
        fill: color,
        fillStyle: "solid",
        roughness: 1.6,
        seed: 42,
      });
      svg.appendChild(filled);
    }
  }, [progress, color, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`-2 -2 ${width + 4} ${height + 4}`}
      className="overflow-visible"
      aria-label={`${Math.round(progress * 100)}% assessed`}
      role="img"
    />
  );
}
