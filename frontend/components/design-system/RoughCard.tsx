"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils/cn";

interface RoughCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export default function RoughCard({
  children,
  className,
  padding = "py-[22px] px-[30px]",
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
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const rect = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1.0,
      bowing: 1,
      fill: "none",
    });
    svg.appendChild(rect);
  }, []);

  useEffect(() => {
    // Double rAF to ensure layout is stable before reading dimensions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawBorder();
      });
    });

    // Redraw on resize to keep borders aligned
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      drawBorder();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [drawBorder]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-visible bg-card-bg rounded-card shadow-card",
        "transition-shadow duration-[0.28s] ease-[cubic-bezier(.4,0,.2,1)]",
        "hover:shadow-card-hover hover:-translate-y-px",
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
