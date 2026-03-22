"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import rough from "roughjs";
import { PieChart } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";

export interface AssessmentWeight {
  name: string;
  weight: number;
  status: "graded" | "submitted" | "upcoming";
}

interface AssessmentDonutProps {
  weights: AssessmentWeight[];
  highlightType?: string;
  courseColor: string;
  courseCode: string;
}

// Generate a palette of segment colors based on the primary course color
function generateSegmentPalette(baseColor: string, count: number): string[] {
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const palette: string[] = [];
  for (let i = 0; i < count; i++) {
    const factor = 0.6 + (i / Math.max(count - 1, 1)) * 0.6;
    const nr = Math.min(255, Math.round(r * factor));
    const ng = Math.min(255, Math.round(g * factor));
    const nb = Math.min(255, Math.round(b * factor));
    palette.push(
      `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`
    );
  }
  return palette;
}

// Desaturate a color for upcoming segments
function desaturateColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  const mix = 0.4;
  const nr = Math.round(r * (1 - mix) + gray * mix);
  const ng = Math.round(g * (1 - mix) + gray * mix);
  const nb = Math.round(b * (1 - mix) + gray * mix);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

interface SegmentData {
  startAngle: number;
  endAngle: number;
  midAngle: number;
  color: string;
  weight: AssessmentWeight;
  percentage: number;
}

// SVG donut geometry constants (from prototype)
const SVG_W = 360;
const SVG_H = 300;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const OUTER_R = 95;
const INNER_R = 55;
const LEADER_START_R = OUTER_R + 14;
const LEADER_ELBOW_R = OUTER_R + 42;
const TAIL_LEN = 30;
const NS = "http://www.w3.org/2000/svg";

/**
 * Build an SVG arc path string for a donut segment (annular ring).
 */
function buildSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const x1o = cx + outerR * Math.cos(startAngle);
  const y1o = cy + outerR * Math.sin(startAngle);
  const x2o = cx + outerR * Math.cos(endAngle);
  const y2o = cy + outerR * Math.sin(endAngle);
  const x1i = cx + innerR * Math.cos(endAngle);
  const y1i = cy + innerR * Math.sin(endAngle);
  const x2i = cx + innerR * Math.cos(startAngle);
  const y2i = cy + innerR * Math.sin(startAngle);

  const sweep = endAngle - startAngle;
  const large = sweep > Math.PI ? 1 : 0;

  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x2i} ${y2i}`,
    "Z",
  ].join(" ");
}

export default function AssessmentDonut({
  weights,
  highlightType,
  courseColor,
  courseCode,
}: AssessmentDonutProps) {
  const t = useTranslations("dashboard");
  const svgRef = useRef<SVGSVGElement>(null);
  const [animationDone, setAnimationDone] = useState(false);

  // Compute segment data
  const segments = useMemo<SegmentData[]>(() => {
    if (weights.length === 0) return [];

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const palette = generateSegmentPalette(courseColor, weights.length);

    let currentAngle = -Math.PI / 2;
    return weights.map((w, i) => {
      const proportion = totalWeight > 0 ? w.weight / totalWeight : 0;
      const sweepAngle = proportion * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle;
      const midAngle = startAngle + sweepAngle / 2;
      currentAngle = endAngle;

      let color = palette[i];
      if (w.status === "upcoming") {
        color = desaturateColor(color);
      }

      return {
        startAngle,
        endAngle,
        midAngle,
        color,
        weight: w,
        percentage: Math.round(proportion * 100),
      };
    });
  }, [weights, courseColor]);

  // Draw donut imperatively with Rough.js (matching prototype exactly)
  const drawDonut = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || segments.length === 0) return;

    // Clear previous content
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);

    // Draw slices with cross-hatch fill (matching prototype)
    for (const seg of segments) {
      const d = buildSegmentPath(CX, CY, OUTER_R, INNER_R, seg.startAngle, seg.endAngle);
      const isHighlighted = highlightType === seg.weight.name;

      const node = rc.path(d, {
        fill: seg.color,
        fillStyle: "cross-hatch",
        fillWeight: 1.8,
        stroke: seg.color,
        strokeWidth: isHighlighted ? 2 : 1,
        roughness: 1.5,
      });
      svg.appendChild(node);
    }

    // Draw leader lines + labels (matching prototype)
    for (const seg of segments) {
      const mid = seg.midAngle;
      const isRight = Math.cos(mid) >= 0;

      const sx = CX + LEADER_START_R * Math.cos(mid);
      const sy = CY + LEADER_START_R * Math.sin(mid);
      const ex = CX + LEADER_ELBOW_R * Math.cos(mid);
      const ey = CY + LEADER_ELBOW_R * Math.sin(mid);
      const tx = isRight ? ex + TAIL_LEN : ex - TAIL_LEN;

      // Hand-drawn leader line (two segments)
      svg.appendChild(
        rc.line(sx, sy, ex, ey, {
          stroke: seg.color,
          strokeWidth: 1,
          roughness: 1.2,
        })
      );
      svg.appendChild(
        rc.line(ex, ey, tx, ey, {
          stroke: seg.color,
          strokeWidth: 1,
          roughness: 1.2,
        })
      );

      // Small dot at start
      svg.appendChild(
        rc.circle(sx, sy, 4, {
          fill: seg.color,
          fillStyle: "solid",
          stroke: seg.color,
          strokeWidth: 0.5,
          roughness: 1,
        })
      );

      // Text labels (SVG text for readability)
      const anchor = isRight ? "start" : "end";
      const labelX = isRight ? tx + 5 : tx - 5;

      const pctText = document.createElementNS(NS, "text");
      pctText.setAttribute("x", String(labelX));
      pctText.setAttribute("y", String(ey - 1));
      pctText.setAttribute("text-anchor", anchor);
      pctText.setAttribute("font-family", "'Source Serif 4', Georgia, serif");
      pctText.setAttribute("font-size", "15");
      pctText.setAttribute("font-weight", "700");
      pctText.setAttribute("fill", seg.color);
      pctText.textContent = `${seg.percentage}%`;
      svg.appendChild(pctText);

      const nameText = document.createElementNS(NS, "text");
      nameText.setAttribute("x", String(labelX));
      nameText.setAttribute("y", String(ey + 15));
      nameText.setAttribute("text-anchor", anchor);
      nameText.setAttribute("font-family", "'Inter', sans-serif");
      nameText.setAttribute("font-size", "12");
      nameText.setAttribute("fill", "#6b6b65");
      nameText.textContent = seg.weight.name;
      svg.appendChild(nameText);
    }
  }, [segments, highlightType]);

  // Converge entry animation, then draw final state with Rough.js
  useEffect(() => {
    if (weights.length === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    setAnimationDone(false);

    // Animate: segments start separated, converge to center
    const duration = 800;
    let startTime: number | null = null;
    let rafId: number;
    const separationMax = 20;

    const animateFrame = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased =
        rawProgress < 0.5
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

      const separationOffset = separationMax * (1 - eased);

      // Clear and redraw at current offset (simple solid fill during animation for performance)
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      for (const seg of segments) {
        const offsetX = Math.cos(seg.midAngle) * separationOffset;
        const offsetY = Math.sin(seg.midAngle) * separationOffset;
        const segCx = CX + offsetX;
        const segCy = CY + offsetY;

        const d = buildSegmentPath(segCx, segCy, OUTER_R, INNER_R, seg.startAngle, seg.endAngle);

        // Use simple path during animation for smooth 60fps
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", seg.color);
        path.setAttribute("stroke", seg.color);
        path.setAttribute("stroke-width", "1");
        path.setAttribute("opacity", String(0.3 + eased * 0.7));
        svg.appendChild(path);
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(animateFrame);
      } else {
        // Animation done — draw final Rough.js version
        setAnimationDone(true);
      }
    };

    rafId = requestAnimationFrame(animateFrame);
    return () => cancelAnimationFrame(rafId);
  }, [weights, segments]);

  // Draw final Rough.js rendering after animation completes
  useEffect(() => {
    if (animationDone) {
      drawDonut();
    }
  }, [animationDone, drawDonut]);

  // Compute soft badge background from courseColor
  const badgeBg = `${courseColor}1c`;

  return (
    <RoughCard className="h-full">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-orange" strokeWidth={2} />
          <h2
            className="font-serif text-text-1"
            style={{ fontSize: "0.95rem", fontWeight: 600 }}
          >
            {t("donut.title")}
          </h2>
        </div>
        {courseCode && (
          <span
            className="rounded"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "1px 8px",
              borderRadius: "4px",
              backgroundColor: badgeBg,
              color: courseColor,
            }}
          >
            {courseCode}
          </span>
        )}
      </div>

      {/* Donut chart or empty state */}
      {weights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <h3
            className="font-serif text-text-2 mb-2"
            style={{ fontSize: "0.95rem", fontWeight: 600 }}
          >
            {t("donut.empty.heading")}
          </h3>
          <p className="text-text-3" style={{ fontSize: "12px" }}>
            {t("donut.empty.body")}
          </p>
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ maxHeight: "300px", overflow: "visible" }}
        />
      )}
    </RoughCard>
  );
}
