"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils/cn";

interface RoughCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  disableHover?: boolean;
}

// Duration (ms) for the rAF burst that tracks layout animation resizes
const RESIZE_BURST_DURATION = 400;

export default function RoughCard({
  children,
  className,
  padding = "py-[22px] px-[30px]",
  disableHover = false,
}: RoughCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drawBorder = useCallback(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    svg.setAttribute("viewBox", `-4 -4 ${w + 8} ${h + 8}`);

    // Clear previous SVG children before drawing
    svg.replaceChildren();

    const rc = rough.svg(svg);
    const rect = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1.0,
      bowing: 1,
      fill: "none",
      seed: 42, // Fixed seed for deterministic hand-drawn paths (no jitter on redraw)
    });
    svg.appendChild(rect);
  }, []);

  useEffect(() => {
    // Double rAF to ensure layout is stable before reading dimensions
    const outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        drawBorder();
      });
    });
    let innerRafId: number;

    // Redraw on resize to keep borders aligned
    const el = containerRef.current;
    if (!el) return;

    let burstRafId: number | null = null;

    const observer = new ResizeObserver(() => {
      // Cancel any ongoing burst to avoid stacking loops
      if (burstRafId !== null) cancelAnimationFrame(burstRafId);

      // Start a rAF burst that redraws the border every frame for RESIZE_BURST_DURATION ms.
      // This ensures the rough.js border follows height changes frame-by-frame
      // during spring/layout animations rather than snapping at discrete intervals.
      const start = performance.now();
      const loop = () => {
        drawBorder();
        if (performance.now() - start < RESIZE_BURST_DURATION) {
          burstRafId = requestAnimationFrame(loop);
        } else {
          burstRafId = null;
        }
      };
      loop();
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
      observer.disconnect();
      if (burstRafId !== null) cancelAnimationFrame(burstRafId);
    };
  }, [drawBorder]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-visible bg-card-bg rounded-card shadow-card",
        "transition-shadow duration-[0.28s] ease-[cubic-bezier(.4,0,.2,1)]",
        !disableHover && "hover:shadow-card-hover hover:-translate-y-px",
        padding,
        className
      )}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
