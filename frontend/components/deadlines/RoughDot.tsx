"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";

/**
 * Rough.js dot rendered alongside each deadline card in the timeline.
 * Extracted to its own file for proper dynamic import code-splitting.
 */
export default function RoughDot({
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
