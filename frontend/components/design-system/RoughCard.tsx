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

// Module-level LRU cache for Rough.js path output, keyed by "WxH" (rounded).
// With seed:42 fixed, the generated path is deterministic — identical sizes
// produce identical SVG subtrees, so any card of the same dimensions can
// clone the cached template instead of re-running the Rough.js algorithm.
// Dashboard/courses/timetable mount many same-width cards; hit rate is high.
const ROUGH_PATH_CACHE = new Map<string, SVGGElement>();
const ROUGH_PATH_CACHE_MAX = 64;

function getRoughBorder(
  svg: SVGSVGElement,
  w: number,
  h: number,
): SVGGElement {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  const cached = ROUGH_PATH_CACHE.get(key);
  if (cached !== undefined) {
    // LRU touch: re-insert at the tail so it is last to be evicted.
    ROUGH_PATH_CACHE.delete(key);
    ROUGH_PATH_CACHE.set(key, cached);
    return cached.cloneNode(true) as SVGGElement;
  }
  const rc = rough.svg(svg);
  const rect = rc.rectangle(0, 0, w, h, {
    stroke: "#d0cdc4",
    strokeWidth: 1.4,
    roughness: 1.5,
    bowing: 1.2,
    fill: "none",
    seed: 42, // Fixed seed → deterministic path for a given (w, h)
  }) as SVGGElement;
  // Evict oldest entry if over the cap. Map iteration order is insertion.
  if (ROUGH_PATH_CACHE.size >= ROUGH_PATH_CACHE_MAX) {
    const oldest = ROUGH_PATH_CACHE.keys().next().value;
    if (oldest !== undefined) ROUGH_PATH_CACHE.delete(oldest);
  }
  ROUGH_PATH_CACHE.set(key, rect);
  // Return a clone so the template stays detached and reusable.
  return rect.cloneNode(true) as SVGGElement;
}

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
    // viewBox matches container exactly; rough wobble overflows via SVG overflow:visible
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // Clear previous SVG children before drawing
    svg.replaceChildren();

    svg.appendChild(getRoughBorder(svg, w, h));
  }, []);

  useEffect(() => {
    // Double rAF to ensure layout is stable before reading dimensions
    let innerRafId: number;
    const outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        drawBorder();
      });
    });

    // Redraw on resize to keep borders aligned
    const el = containerRef.current;
    if (!el) return;

    let pendingRafId: number | null = null;

    // Single-frame rAF debounce: coalesce all ResizeObserver callbacks fired in
    // the same frame into one drawBorder() call. Avoids the per-card 400 ms x
    // 60 fps redraw burst that saturates the main thread when N cards mount or
    // resize simultaneously (skeleton -> content swap, scrollbar toggle, etc).
    const observer = new ResizeObserver(() => {
      if (pendingRafId !== null) return;
      pendingRafId = requestAnimationFrame(() => {
        pendingRafId = null;
        drawBorder();
      });
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
      observer.disconnect();
      if (pendingRafId !== null) cancelAnimationFrame(pendingRafId);
    };
  }, [drawBorder]);

  return (
    <div
      ref={containerRef}
      data-testid="rough-card-outer"
      className={cn(
        "relative overflow-visible p-[10px]",
        "transition-shadow duration-[0.28s] ease-[cubic-bezier(.4,0,.2,1)]",
        !disableHover && "hover:shadow-card-hover hover:-translate-y-px",
        className
      )}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
      />
      <div
        className={cn(
          "relative bg-card-bg shadow-card overflow-hidden rounded-[6px]",
          padding
        )}
      >
        <div className="relative z-[1]">{children}</div>
      </div>
    </div>
  );
}
