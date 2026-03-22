"use client";

import { useRef, useEffect, useState, useMemo } from "react";
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
  // Parse hex color to HSL-like variations
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Create variations by adjusting lightness/saturation
  const palette: string[] = [];
  for (let i = 0; i < count; i++) {
    const factor = 0.6 + (i / Math.max(count - 1, 1)) * 0.6; // Range 0.6 to 1.2
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
  // Mix with gray for desaturation
  const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  const mix = 0.4; // 40% desaturation
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

export default function AssessmentDonut({
  weights,
  highlightType,
  courseColor,
  courseCode,
}: AssessmentDonutProps) {
  const t = useTranslations("dashboard");
  const svgRef = useRef<SVGSVGElement>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Compute segment data
  const segments = useMemo<SegmentData[]>(() => {
    if (weights.length === 0) return [];

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const palette = generateSegmentPalette(courseColor, weights.length);

    let currentAngle = -Math.PI / 2; // Start at top
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

  // Converge entry animation
  useEffect(() => {
    if (weights.length === 0) return;

    setAnimationProgress(0);

    // Use rAF-based animation with cubic-bezier easing
    const duration = 800; // ms
    let startTime: number | null = null;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);

      // Cubic bezier approximation: cubic-bezier(.16,1,.3,1) — fast start, gentle settle
      const eased =
        rawProgress < 0.5
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

      setAnimationProgress(eased);

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    // Start animation on next frame
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [weights]);

  // Draw donut with Rough.js
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || segments.length === 0) return;

    svg.replaceChildren();

    const rc = rough.svg(svg);
    const cx = 180;
    const cy = 150;
    const outerR = 95;
    const separationOffset = 20 * (1 - animationProgress);

    segments.forEach((seg, idx) => {
      const isHighlighted = highlightType === seg.weight.name;

      // Compute separation offset along midpoint angle direction
      const offsetX = Math.cos(seg.midAngle) * separationOffset;
      const offsetY = Math.sin(seg.midAngle) * separationOffset;

      // If highlighted, add 4px extra push outward
      const highlightPush = isHighlighted ? 4 : 0;
      const totalOffsetX =
        offsetX + Math.cos(seg.midAngle) * highlightPush;
      const totalOffsetY =
        offsetY + Math.sin(seg.midAngle) * highlightPush;

      const segCx = cx + totalOffsetX;
      const segCy = cy + totalOffsetY;

      // Draw arc segment
      const arc = rc.arc(
        segCx,
        segCy,
        outerR * 2,
        outerR * 2,
        seg.startAngle,
        seg.endAngle,
        false,
        {
          stroke: seg.color,
          strokeWidth: isHighlighted ? 2 : 40,
          roughness: 1.5,
          fill: seg.color,
          fillStyle: "cross-hatch",
          fillWeight: isHighlighted ? 2.5 : 1.8,
          seed: 42 + idx,
        }
      );

      // Wrap in a group for potential transform
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.appendChild(arc);
      svg.appendChild(g);
    });

    // Draw leader lines and labels
    segments.forEach((seg) => {
      const leaderStartR = outerR + 14;
      const leaderElbowR = outerR + 42;
      const tailLength = 30;

      const startX = cx + Math.cos(seg.midAngle) * leaderStartR;
      const startY = cy + Math.sin(seg.midAngle) * leaderStartR;
      const elbowX = cx + Math.cos(seg.midAngle) * leaderElbowR;
      const elbowY = cy + Math.sin(seg.midAngle) * leaderElbowR;

      // Determine side
      const isRight = seg.midAngle > -Math.PI / 2 && seg.midAngle < Math.PI / 2;
      const tailEndX = isRight ? elbowX + tailLength : elbowX - tailLength;

      // Draw leader line
      const leaderLine = rc.linearPath(
        [
          [startX, startY],
          [elbowX, elbowY],
          [tailEndX, elbowY],
        ],
        {
          stroke: "#d5d2ca",
          strokeWidth: 0.8,
          roughness: 0.5,
          seed: 100 + segments.indexOf(seg),
        }
      );
      svg.appendChild(leaderLine);

      // Add text labels using SVG text elements
      const labelX = isRight ? tailEndX + 4 : tailEndX - 4;
      const textAnchor = isRight ? "start" : "end";

      // Percentage label
      const pctText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      pctText.setAttribute("x", String(labelX));
      pctText.setAttribute("y", String(elbowY - 2));
      pctText.setAttribute("text-anchor", textAnchor);
      pctText.setAttribute("font-family", "var(--font-serif)");
      pctText.setAttribute("font-size", "15");
      pctText.setAttribute("font-weight", "600");
      pctText.setAttribute("fill", seg.color);
      pctText.textContent = `${seg.percentage}%`;
      svg.appendChild(pctText);

      // Assessment name label
      const nameText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      nameText.setAttribute("x", String(labelX));
      nameText.setAttribute("y", String(elbowY + 12));
      nameText.setAttribute("text-anchor", textAnchor);
      nameText.setAttribute("font-family", "var(--font-sans)");
      nameText.setAttribute("font-size", "12");
      nameText.setAttribute("fill", "#6b6b65");
      nameText.textContent = seg.weight.name;
      svg.appendChild(nameText);
    });
  }, [segments, animationProgress, highlightType, courseColor]);

  // Compute soft badge background from courseColor
  const badgeBg = `${courseColor}1c`; // ~11% opacity in hex

  return (
    <RoughCard>
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
          viewBox="0 0 360 300"
          className="w-full"
          style={{ maxHeight: "300px" }}
        />
      )}
    </RoughCard>
  );
}
