"use client";

import { useRef, useEffect, useCallback, type ReactNode, type CSSProperties } from "react";
import rough from "roughjs";
import clsx from "clsx";

interface RoughCardProps {
  children: ReactNode;
  className?: string;
  roughness?: number;
  style?: CSSProperties;
}

/**
 * Card with a hand-drawn SVG border using Rough.js.
 * Uses ResizeObserver with dimension comparison guard to prevent infinite loops.
 */
export default function RoughCard({
  children,
  className,
  roughness = 1.0,
  style,
}: RoughCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDims = useRef({ w: 0, h: 0 });

  const drawBorder = useCallback(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // Dimension comparison guard: skip if size unchanged
    if (w === prevDims.current.w && h === prevDims.current.h) return;
    prevDims.current = { w, h };

    svg.setAttribute("viewBox", `-4 -4 ${w + 8} ${h + 8}`);
    svg.style.width = `${w + 8}px`;
    svg.style.height = `${h + 8}px`;

    // Clear previous drawing
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const node = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness,
      bowing: 1,
      fill: "none",
    });
    svg.appendChild(node);
  }, [roughness]);

  useEffect(() => {
    // Double rAF for layout measurement
    requestAnimationFrame(() => {
      requestAnimationFrame(drawBorder);
    });

    const observer = new ResizeObserver(drawBorder);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [drawBorder]);

  return (
    <div
      ref={containerRef}
      className={clsx("relative overflow-visible", className)}
      style={style}
    >
      <svg
        ref={svgRef}
        className="absolute pointer-events-none z-[2]"
        style={{
          top: "-4px",
          left: "-4px",
          overflow: "visible",
        }}
      />
      {children}
    </div>
  );
}
