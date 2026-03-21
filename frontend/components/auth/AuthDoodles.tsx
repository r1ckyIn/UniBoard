"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";

/**
 * Colorful Rough.js background doodles for auth page.
 * Adapted from HeroDoodles with lower opacity (0.15-0.20)
 * and full-screen scattered placement.
 */
export default function AuthDoodles() {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawDoodles = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);

    // Helper: Star shape (10-point polygon)
    function star(cx: number, cy: number, r: number) {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.38;
        pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
      }
      return rc.polygon(pts, {
        stroke: "#d97757",
        strokeWidth: 4,
        roughness: 3,
        fill: "none",
        bowing: 2.5,
      });
    }

    // Helper: Sparkle (cross lines)
    function sparkle(x: number, y: number, s: number) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.appendChild(
        rc.line(x - s, y, x + s, y, {
          stroke: "#d97757",
          strokeWidth: 3.5,
          roughness: 3,
        }),
      );
      g.appendChild(
        rc.line(x, y - s, x, y + s, {
          stroke: "#d97757",
          strokeWidth: 3.5,
          roughness: 3,
        }),
      );
      return g;
    }

    // Helper: Circle cluster
    function dots(x: number, y: number) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.appendChild(
        rc.circle(x, y, 22, {
          stroke: "#6a9bcc",
          strokeWidth: 3.5,
          roughness: 3,
        }),
      );
      g.appendChild(
        rc.circle(x + 28, y - 20, 16, {
          stroke: "#788c5d",
          strokeWidth: 3.5,
          roughness: 3,
        }),
      );
      g.appendChild(
        rc.circle(x - 18, y + 22, 18, {
          stroke: "#d97757",
          strokeWidth: 3.5,
          roughness: 3,
        }),
      );
      return g;
    }

    // Helper: Wavy line
    function wave(x: number, y: number, len: number) {
      let d = `M ${x} ${y}`;
      for (let i = 0; i < 4; i++) {
        const x1 = x + (len / 4) * i + len / 8;
        const y1 = y + (i % 2 === 0 ? -20 : 20);
        const x2 = x + (len / 4) * (i + 1);
        d += ` Q ${x1} ${y1}, ${x2} ${y}`;
      }
      return rc.path(d, {
        stroke: "#ddd8ce",
        strokeWidth: 3.5,
        roughness: 2,
      });
    }

    // Scatter doodles across full screen
    const els: { el: SVGElement; op: number }[] = [
      // Top-left area
      { el: star(w * 0.08, h * 0.12, 50), op: 0.18 },
      { el: sparkle(w * 0.15, h * 0.22, 18), op: 0.15 },

      // Top-right area
      { el: dots(w * 0.85, h * 0.1), op: 0.17 },
      { el: sparkle(w * 0.78, h * 0.25, 16), op: 0.15 },

      // Bottom-left area
      { el: dots(w * 0.1, h * 0.78), op: 0.17 },
      { el: wave(w * 0.05, h * 0.88, w * 0.25), op: 0.2 },

      // Bottom-right area
      { el: star(w * 0.88, h * 0.82, 60), op: 0.18 },
      { el: sparkle(w * 0.82, h * 0.72, 20), op: 0.16 },

      // Center: concentric circles (very faint)
      {
        el: rc.circle(w * 0.5, h * 0.5, 180, {
          stroke: "#eae7e0",
          strokeWidth: 0.8,
          roughness: 2,
          fill: "none",
        }),
        op: 0.1,
      },
      {
        el: rc.circle(w * 0.5, h * 0.5, 240, {
          stroke: "#eae7e0",
          strokeWidth: 0.5,
          roughness: 2.5,
          fill: "none",
        }),
        op: 0.08,
      },
    ];

    els.forEach((o) => {
      o.el.setAttribute("opacity", String(o.op));
      svg.appendChild(o.el);
    });
  }, []);

  useEffect(() => {
    drawDoodles();

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(drawDoodles);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [drawDoodles]);

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
