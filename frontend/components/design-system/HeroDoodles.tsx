"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";

/**
 * Decorative background shapes using Rough.js.
 * Renders stars, sparkles, circle clusters, wavy lines,
 * and concentric circles behind hero content.
 */
export default function HeroDoodles() {
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
        })
      );
      g.appendChild(
        rc.line(x, y - s, x, y + s, {
          stroke: "#d97757",
          strokeWidth: 3.5,
          roughness: 3,
        })
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
        })
      );
      g.appendChild(
        rc.circle(x + 28, y - 20, 16, {
          stroke: "#788c5d",
          strokeWidth: 3.5,
          roughness: 3,
        })
      );
      g.appendChild(
        rc.circle(x - 18, y + 22, 18, {
          stroke: "#d97757",
          strokeWidth: 3.5,
          roughness: 3,
        })
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

    // Place decorations
    const mx = w * 0.45;
    const my = h * 0.45 - 50;

    const els: { el: SVGElement; op: number }[] = [
      { el: star(mx - 430, my - 200, 55), op: 0.25 },
      { el: star(mx + 270, my - 180, 75), op: 0.22 },
      { el: dots(mx - 490, my - 50), op: 0.22 },
      { el: sparkle(mx + 380, my - 10, 22), op: 0.22 },
      { el: sparkle(mx + 230, my + 130, 18), op: 0.2 },
      { el: dots(mx + 340, my + 110), op: 0.2 },
      { el: sparkle(mx - 520, my + 40, 20), op: 0.22 },
      { el: sparkle(mx - 510, my + 160, 16), op: 0.18 },
      { el: wave(mx - 470, my + 220, w * 0.5), op: 0.3 },
      {
        el: rc.circle(mx - 40, my - 160, 160, {
          stroke: "#eae7e0",
          strokeWidth: 0.8,
          roughness: 2,
          fill: "none",
        }),
        op: 0.15,
      },
      {
        el: rc.circle(mx - 40, my - 160, 210, {
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

    const handleResize = () => {
      drawDoodles();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [drawDoodles]);

  return (
    <svg
      ref={svgRef}
      className="fixed top-0 left-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
