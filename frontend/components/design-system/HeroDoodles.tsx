"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";

/**
 * Fixed-position background layer with Rough.js hand-drawn doodles
 * (stars, waves, dots) at low opacity. Notebook-margin-doodle aesthetic.
 * Positioned absolutely, pointer-events none.
 */
export default function HeroDoodles() {
  const svgRef = useRef<SVGSVGElement>(null);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const color = "#d0cdc4";

    // Star-like shape (top-right area)
    const star1 = rc.line(840, 120, 840, 148, {
      stroke: color,
      strokeWidth: 0.8,
      roughness: 1.5,
    });
    svg.appendChild(star1);
    const star2 = rc.line(826, 134, 854, 134, {
      stroke: color,
      strokeWidth: 0.8,
      roughness: 1.5,
    });
    svg.appendChild(star2);

    // Small dots cluster (top-left)
    [
      [120, 80],
      [135, 90],
      [125, 105],
    ].forEach(([x, y]) => {
      const dot = rc.circle(x, y, 4, {
        stroke: color,
        fill: color,
        fillStyle: "solid",
        roughness: 1.2,
        strokeWidth: 0.5,
      });
      svg.appendChild(dot);
    });

    // Wavy line (bottom area)
    const wavePath = "M 200 380 Q 230 370 260 380 Q 290 390 320 380 Q 350 370 380 380";
    const wave = rc.path(wavePath, {
      stroke: color,
      strokeWidth: 0.8,
      roughness: 1.5,
      fill: "none",
    });
    svg.appendChild(wave);

    // Small circle (middle-right)
    const circle = rc.circle(900, 280, 16, {
      stroke: color,
      strokeWidth: 0.6,
      roughness: 1.8,
      fill: "none",
    });
    svg.appendChild(circle);

    // Another star-like shape (bottom-left)
    const star3 = rc.line(80, 340, 80, 360, {
      stroke: color,
      strokeWidth: 0.8,
      roughness: 1.5,
    });
    svg.appendChild(star3);
    const star4 = rc.line(70, 350, 90, 350, {
      stroke: color,
      strokeWidth: 0.8,
      roughness: 1.5,
    });
    svg.appendChild(star4);
  }, []);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[1]"
      style={{ opacity: 0.07, overflow: "visible" }}
      preserveAspectRatio="none"
      viewBox="0 0 1000 500"
    />
  );
}
