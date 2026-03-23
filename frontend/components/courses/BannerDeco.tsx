"use client";

import { useRef, useEffect } from "react";
import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg";

interface BannerDecoProps {
  patternIndex: number; // 0-4
  width: number; // banner width for viewBox
  height: number; // banner height (120)
}

/**
 * Draw one of 5 hand-drawn doodle patterns onto a Rough.js SVG canvas.
 * Each pattern uses white semi-transparent strokes so it layers
 * nicely over the coloured course banner.
 */
function drawPattern(rc: RoughSVG, svg: SVGSVGElement, index: number): void {
  const shared = { fill: "none" as const, seed: 42 };

  switch (index) {
    case 0: {
      // Circle + sparkle cross
      const circle = rc.circle(220, 30, 40, {
        ...shared,
        stroke: "rgba(255,255,255,.3)",
        strokeWidth: 2,
        roughness: 2.5,
      });
      const hLine = rc.line(260, 50, 280, 50, {
        ...shared,
        stroke: "rgba(255,255,255,.3)",
        strokeWidth: 2,
        roughness: 2.5,
      });
      const vLine = rc.line(270, 40, 270, 60, {
        ...shared,
        stroke: "rgba(255,255,255,.3)",
        strokeWidth: 2,
        roughness: 2.5,
      });
      svg.appendChild(circle);
      svg.appendChild(hLine);
      svg.appendChild(vLine);
      break;
    }

    case 1: {
      // Wave + small circle
      const wave = rc.path(
        "M 180 20 Q 200 8, 220 20 Q 240 32, 260 20 Q 280 8, 300 20",
        {
          ...shared,
          stroke: "rgba(255,255,255,.25)",
          strokeWidth: 2,
          roughness: 2,
        }
      );
      const dot = rc.circle(290, 60, 20, {
        ...shared,
        stroke: "rgba(255,255,255,.25)",
        strokeWidth: 2,
        roughness: 2,
      });
      svg.appendChild(wave);
      svg.appendChild(dot);
      break;
    }

    case 2: {
      // 10-point star + small circle
      const cx = 250;
      const cy = 35;
      const outerR = 18;
      const innerR = 7;
      const points: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
        const r = i % 2 === 0 ? outerR : innerR;
        points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      const star = rc.polygon(points, {
        ...shared,
        stroke: "rgba(255,255,255,.3)",
        strokeWidth: 2,
        roughness: 2.5,
      });
      const smallCircle = rc.circle(210, 70, 14, {
        ...shared,
        stroke: "rgba(255,255,255,.3)",
        strokeWidth: 2,
        roughness: 2.5,
      });
      svg.appendChild(star);
      svg.appendChild(smallCircle);
      break;
    }

    case 3: {
      // Dots cluster - three circles
      const d1 = rc.circle(240, 30, 16, {
        ...shared,
        stroke: "rgba(255,255,255,.25)",
        strokeWidth: 1.5,
        roughness: 2,
      });
      const d2 = rc.circle(265, 45, 12, {
        ...shared,
        stroke: "rgba(255,255,255,.25)",
        strokeWidth: 1.5,
        roughness: 2,
      });
      const d3 = rc.circle(225, 55, 10, {
        ...shared,
        stroke: "rgba(255,255,255,.2)",
        strokeWidth: 1.5,
        roughness: 2,
      });
      svg.appendChild(d1);
      svg.appendChild(d2);
      svg.appendChild(d3);
      break;
    }

    case 4: {
      // Zigzag + circle
      const zigzag = rc.path(
        "M 200 25 L 215 15 L 230 25 L 245 15 L 260 25",
        {
          ...shared,
          stroke: "rgba(255,255,255,.25)",
          strokeWidth: 2,
          roughness: 2,
        }
      );
      const circle = rc.circle(280, 50, 18, {
        ...shared,
        stroke: "rgba(255,255,255,.25)",
        strokeWidth: 2,
        roughness: 2,
      });
      svg.appendChild(zigzag);
      svg.appendChild(circle);
      break;
    }
  }
}

export default function BannerDeco({ patternIndex, width, height }: BannerDecoProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous SVG children before drawing
    svg.replaceChildren();

    const rc = rough.svg(svg);
    const normalised = ((patternIndex % 5) + 5) % 5;
    drawPattern(rc, svg, normalised);
  }, [patternIndex, width, height]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 w-full h-full overflow-visible"
      style={{ pointerEvents: "none" }}
    />
  );
}
