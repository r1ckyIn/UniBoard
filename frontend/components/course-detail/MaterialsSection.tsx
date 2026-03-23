"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { useTranslations } from "next-intl";
import { Folder } from "lucide-react";
import type { components } from "@/lib/api/types.gen";
import MaterialItem from "@/components/course-detail/MaterialItem";

type Material = components["schemas"]["Material"];

interface MaterialsSectionProps {
  materials: Material[];
  courseColor: string;
  courseSoft: string;
}

/**
 * Extract week number from a material title using regex.
 * Falls back to index + 1 if no match found.
 */
function extractWeek(title: string, fallback: number): number {
  const match = title.match(/Week\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : fallback;
}

/**
 * Course materials section card: two-layer hand-drawn border,
 * list of material items with week badges and source type icons.
 */
export default function MaterialsSection({
  materials,
  courseColor,
  courseSoft,
}: MaterialsSectionProps) {
  const t = useTranslations("courseDetail");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drawBorder = useCallback(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    svg.setAttribute("viewBox", `-4 -4 ${w + 8} ${h + 8}`);
    svg.replaceChildren();

    const rc = rough.svg(svg);
    const rect = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1,
      bowing: 1,
      fill: "none",
      seed: 42,
    });
    svg.appendChild(rect);
  }, []);

  useEffect(() => {
    let innerRafId: number;
    const outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        drawBorder();
      });
    });

    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => drawBorder());
    observer.observe(el);

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
      observer.disconnect();
    };
  }, [drawBorder]);

  // Determine which materials should show "New" badge
  // Heuristic: last Ed lesson (has slide_count) is considered new
  const lastEdLessonIndex = materials.reduce(
    (acc, m, i) => (m.source === "ed" && m.slide_count ? i : acc),
    -1
  );

  // Count unique weeks for badge display
  const weekCount = new Set(
    materials.map((m, i) => extractWeek(m.title, i + 1))
  ).size;

  return (
    <div
      ref={containerRef}
      className="relative overflow-visible p-[10px]"
      style={{ background: "transparent" }}
    >
      {/* Hand-drawn border SVG */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
      />

      <div className="bg-[#f6f5f0] overflow-hidden">
        <div className="px-[26px] py-[22px]">
          {/* Card header */}
          <div className="flex items-center justify-between mb-[12px]">
            <div className="text-[0.92rem] font-semibold flex items-center gap-[8px]">
              <Folder size={18} className="text-[#d97757]" />
              {t("materials.title")}
            </div>
            <span className="text-[0.68rem] px-[9px] py-[3px] rounded-[6px] font-semibold bg-[rgba(217,119,87,0.11)] text-[#d97757]">
              {weekCount} weeks
            </span>
          </div>

          {/* Materials list or empty state */}
          {materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[32px] text-[#9b9b94]">
              <Folder size={24} className="mb-[8px]" />
              <span className="text-[0.84rem]">{t("materials.empty")}</span>
            </div>
          ) : (
            <div>
              {materials.map((m, i) => (
                <MaterialItem
                  key={m.id}
                  title={m.title}
                  source={m.source}
                  sourceType={m.source_type}
                  itemCount={m.items?.length}
                  slideCount={m.slide_count}
                  url={m.url}
                  weekNumber={extractWeek(m.title, i + 1)}
                  courseColor={courseColor}
                  courseSoft={courseSoft}
                  isNew={i === lastEdLessonIndex}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
