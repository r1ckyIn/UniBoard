"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
  // Parse hex color to RGB variations
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

// SVG donut geometry constants (from prototype)
const SVG_W = 360;
const SVG_H = 300;
const CX = SVG_W / 2; // 180
const CY = SVG_H / 2; // 150
const OUTER_R = 95;
const INNER_R = 55;
const LEADER_START_R = OUTER_R + 14; // 109
const LEADER_ELBOW_R = OUTER_R + 42; // 137
const TAIL_LEN = 30;
const HIGHLIGHT_PUSH = 4;
const SEPARATION_MAX = 20;

/**
 * Build an SVG arc path for a donut segment (annular ring).
 * M x1outer y1outer
 * A outerR outerR 0 largeArcFlag 1 x2outer y2outer
 * L x1inner y1inner
 * A innerR innerR 0 largeArcFlag 0 x2inner y2inner
 * Z
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

      // Cubic bezier approximation: fast start, gentle settle
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

  // Compute all SVG element data declaratively
  const svgElements = useMemo(() => {
    if (segments.length === 0) return null;

    const separationOffset = SEPARATION_MAX * (1 - animationProgress);
    const showLeaders = animationProgress >= 0.95;

    const segmentPaths = segments.map((seg) => {
      const isHighlighted = highlightType === seg.weight.name;

      // Compute separation offset along midpoint angle direction
      const offsetX = Math.cos(seg.midAngle) * separationOffset;
      const offsetY = Math.sin(seg.midAngle) * separationOffset;

      // If highlighted, add extra push outward
      const push = isHighlighted ? HIGHLIGHT_PUSH : 0;
      const totalOffsetX = offsetX + Math.cos(seg.midAngle) * push;
      const totalOffsetY = offsetY + Math.sin(seg.midAngle) * push;

      const segCx = CX + totalOffsetX;
      const segCy = CY + totalOffsetY;

      const d = buildSegmentPath(
        segCx,
        segCy,
        OUTER_R,
        INNER_R,
        seg.startAngle,
        seg.endAngle
      );

      return {
        d,
        fill: seg.color,
        stroke: seg.color,
        strokeWidth: isHighlighted ? 2 : 1,
        key: `seg-${seg.weight.name}`,
      };
    });

    // Leader lines and labels (only show after animation completes)
    const leaders = showLeaders
      ? segments.map((seg) => {
          const mid = seg.midAngle;
          const isRight = Math.cos(mid) >= 0;

          // Points: start on outer edge -> elbow -> horizontal tail
          const sx = CX + LEADER_START_R * Math.cos(mid);
          const sy = CY + LEADER_START_R * Math.sin(mid);
          const ex = CX + LEADER_ELBOW_R * Math.cos(mid);
          const ey = CY + LEADER_ELBOW_R * Math.sin(mid);
          const tx = isRight ? ex + TAIL_LEN : ex - TAIL_LEN;

          const anchor: "start" | "end" = isRight ? "start" : "end";
          const labelX = isRight ? tx + 5 : tx - 5;

          return {
            key: `leader-${seg.weight.name}`,
            color: seg.color,
            // Small dot at start
            dot: { cx: sx, cy: sy, r: 2 },
            // Radial line: start -> elbow
            line1: { x1: sx, y1: sy, x2: ex, y2: ey },
            // Horizontal tail: elbow -> end
            line2: { x1: ex, y1: ey, x2: tx, y2: ey },
            // Labels
            pctLabel: {
              x: labelX,
              y: ey - 1,
              anchor,
              text: `${seg.percentage}%`,
            },
            nameLabel: {
              x: labelX,
              y: ey + 15,
              anchor,
              text: seg.weight.name,
            },
          };
        })
      : [];

    return { segmentPaths, leaders };
  }, [segments, animationProgress, highlightType]);

  // Compute soft badge background from courseColor
  const badgeBg = `${courseColor}1c`; // ~11% opacity in hex

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
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ maxHeight: "300px", overflow: "visible" }}
        >
          {/* Donut segments */}
          {svgElements?.segmentPaths.map((seg) => (
            <path
              key={seg.key}
              d={seg.d}
              fill={seg.fill}
              stroke={seg.stroke}
              strokeWidth={seg.strokeWidth}
            />
          ))}

          {/* Leader lines + labels */}
          {svgElements?.leaders.map((leader) => (
            <g key={leader.key}>
              {/* Small filled dot at start point on donut edge */}
              <circle
                cx={leader.dot.cx}
                cy={leader.dot.cy}
                r={leader.dot.r}
                fill={leader.color}
              />
              {/* Radial line: start -> elbow */}
              <line
                x1={leader.line1.x1}
                y1={leader.line1.y1}
                x2={leader.line1.x2}
                y2={leader.line1.y2}
                stroke={leader.color}
                strokeWidth={1}
              />
              {/* Horizontal tail line: elbow -> end */}
              <line
                x1={leader.line2.x1}
                y1={leader.line2.y1}
                x2={leader.line2.x2}
                y2={leader.line2.y2}
                stroke={leader.color}
                strokeWidth={1}
              />
              {/* Percentage label */}
              <text
                x={leader.pctLabel.x}
                y={leader.pctLabel.y}
                textAnchor={leader.pctLabel.anchor}
                fontFamily="'Source Serif 4', Georgia, serif"
                fontSize={15}
                fontWeight={700}
                fill={leader.color}
              >
                {leader.pctLabel.text}
              </text>
              {/* Assessment name label */}
              <text
                x={leader.nameLabel.x}
                y={leader.nameLabel.y}
                textAnchor={leader.nameLabel.anchor}
                fontFamily="'Inter', sans-serif"
                fontSize={12}
                fill="#6b6b65"
              >
                {leader.nameLabel.text}
              </text>
            </g>
          ))}
        </svg>
      )}
    </RoughCard>
  );
}
