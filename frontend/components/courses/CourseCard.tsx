"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { getGradeBand } from "@/lib/utils/grade-band";
import { withClientOnly } from "@/components/design-system/ClientOnly";

const BannerDecoClient = withClientOnly(
  () => import("@/components/courses/BannerDeco")
);

// Stable options reference for the progress-bar background rectangle.
const PROGRESS_BG_OPTIONS = {
  stroke: "#d5d2ca",
  fill: "#eae7e0",
  fillStyle: "solid",
  roughness: 1.2,
  seed: 42,
} as const;

// Module-level LRU cache for the progress-bar background rect, keyed by
// rounded width (height is constant 10). Fill rects are not cached because
// their width is a continuous product of progress and vary per course color.
const PROGRESS_BG_CACHE = new Map<number, SVGGElement>();
const PROGRESS_BG_CACHE_MAX = 16;

function getCachedProgressBg(svg: SVGSVGElement, w: number): SVGGElement {
  const key = Math.round(w);
  const cached = PROGRESS_BG_CACHE.get(key);
  if (cached !== undefined) {
    PROGRESS_BG_CACHE.delete(key);
    PROGRESS_BG_CACHE.set(key, cached);
    return cached.cloneNode(true) as SVGGElement;
  }
  const rc = rough.svg(svg);
  const rect = rc.rectangle(0, 0, w, 10, PROGRESS_BG_OPTIONS) as SVGGElement;
  if (PROGRESS_BG_CACHE.size >= PROGRESS_BG_CACHE_MAX) {
    const oldest = PROGRESS_BG_CACHE.keys().next().value;
    if (oldest !== undefined) PROGRESS_BG_CACHE.delete(oldest);
  }
  PROGRESS_BG_CACHE.set(key, rect);
  return rect.cloneNode(true) as SVGGElement;
}

// Inline progress bar that fills remaining width via CSS
function ProgressBarFill({ progress, color }: { progress: number; color: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const w = container.offsetWidth;
    const h = 10;
    svg.setAttribute("viewBox", `-2 -2 ${w + 4} ${h + 4}`);
    svg.replaceChildren();

    svg.appendChild(getCachedProgressBg(svg, w));
    if (progress > 0) {
      const rc = rough.svg(svg);
      svg.appendChild(rc.rectangle(0, 0, w * Math.min(progress, 1), h, {
        stroke: color, fill: color, fillStyle: "solid", roughness: 1.6, seed: 42,
      }));
    }
  }, [progress, color]);

  useEffect(() => {
    // Initial paint on a rAF to let layout settle before reading offsetWidth.
    const initialRafId = requestAnimationFrame(() => draw());
    const el = containerRef.current;
    if (!el) return () => cancelAnimationFrame(initialRafId);

    // Single-frame rAF debounce on resize — same pattern as RoughCard /
    // CourseCard, avoids redrawing 60 fps while parent animations settle.
    let pendingRafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (pendingRafId !== null) return;
      pendingRafId = requestAnimationFrame(() => {
        pendingRafId = null;
        draw();
      });
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(initialRafId);
      observer.disconnect();
      if (pendingRafId !== null) cancelAnimationFrame(pendingRafId);
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="flex-1 min-w-0">
      <svg ref={svgRef} className="w-full overflow-visible" style={{ height: 14 }}
        aria-label={`${Math.round(progress * 100)}% assessed`} role="img" />
    </div>
  );
}

// Module-level LRU cache for the course-card Rough.js border, keyed by "WxH"
// (rounded). seed:42 is fixed so identical sizes yield identical SVG subtrees.
// Dashboard/courses pages mount multiple CourseCard instances at the same
// width (grid columns); this lets them clone one template instead of each
// re-running the Rough.js generator.
const COURSE_BORDER_CACHE = new Map<string, SVGGElement>();
const COURSE_BORDER_CACHE_MAX = 32;

function getCourseCardBorder(
  svg: SVGSVGElement,
  w: number,
  h: number,
): SVGGElement {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  const cached = COURSE_BORDER_CACHE.get(key);
  if (cached !== undefined) {
    // LRU touch: re-insert at the tail.
    COURSE_BORDER_CACHE.delete(key);
    COURSE_BORDER_CACHE.set(key, cached);
    return cached.cloneNode(true) as SVGGElement;
  }
  const rc = rough.svg(svg);
  const rect = rc.rectangle(0, 0, w, h, {
    stroke: "#d0cdc4",
    strokeWidth: 0.8,
    roughness: 1.0,
    bowing: 1,
    fill: "none",
    seed: 42,
  }) as SVGGElement;
  if (COURSE_BORDER_CACHE.size >= COURSE_BORDER_CACHE_MAX) {
    const oldest = COURSE_BORDER_CACHE.keys().next().value;
    if (oldest !== undefined) COURSE_BORDER_CACHE.delete(oldest);
  }
  COURSE_BORDER_CACHE.set(key, rect);
  return rect.cloneNode(true) as SVGGElement;
}

interface CourseCardProps {
  id: string;
  name: string;
  code: string;
  semester: string;
  currentMark: number | null;
  completedWeight: number;
  colorBase: string;
  colorSoft: string;
  decoIndex: number;
}

// Grade band label keys for i18n
const BAND_KEYS: Record<string, string> = {
  HD: "bandHD",
  D: "bandD",
  CR: "bandCR",
  P: "bandP",
  F: "bandF",
};

export default function CourseCard({
  id,
  name,
  code,
  semester,
  currentMark,
  completedWeight,
  colorBase,
  colorSoft,
  decoIndex,
}: CourseCardProps) {
  const t = useTranslations("courses");
  const router = useRouter();

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
    svg.appendChild(getCourseCardBorder(svg, w, h));
  }, []);

  useEffect(() => {
    // Double rAF to ensure layout is stable before reading dimensions
    let innerRafId: number;
    const outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        drawBorder();
      });
    });

    // Redraw on resize to keep the border aligned — same single-frame rAF
    // debounce pattern as RoughCard.tsx. The previous 400 ms x 60 fps burst
    // compounded across 4+ simultaneously-mounting course cards and froze
    // the courses list page.
    const el = containerRef.current;
    if (!el) return;

    let pendingRafId: number | null = null;
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

  // Compute grade band
  const gradeBand = getGradeBand(currentMark);
  const bandKey = currentMark != null ? BAND_KEYS[gradeBand] : null;

  return (
    <div
      ref={containerRef}
      data-testid="course-card"
      onClick={() => router.push(`/courses/${id}`)}
      className="cursor-pointer relative overflow-visible p-[6px] transition-transform duration-[0.28s] ease-[cubic-bezier(.4,0,.2,1)] hover:-translate-y-[3px]"
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[10] overflow-visible"
      />

      <div className="bg-[#f6f5f0] overflow-hidden shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)]">
        <div className="relative h-[120px] overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: colorBase }} />

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.35) 100%)",
            }}
          />

          <BannerDecoClient
            patternIndex={decoIndex}
            width={300}
            height={120}
          />

          <div className="absolute bottom-0 left-0 right-0 p-[14px_18px] z-[1]">
            <div
              className="text-[0.72rem] font-semibold font-sans text-white/90"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,.15)" }}
            >
              {code}
            </div>
            <div
              className="text-[1.05rem] font-bold font-serif leading-[1.25] text-white"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,.2)" }}
            >
              {name}
            </div>
          </div>
        </div>

        <div className="p-[14px_18px_16px]">
          <div className="text-[0.7rem] font-medium text-[#9b9b94] mb-[8px]">
            {t("termPrefix")} {semester}
          </div>

          <div className="flex items-center gap-[8px] mb-[8px]">
            <span className="text-[0.72rem] font-medium text-[#6b6b65]">
              {t("gradeLabel")}
            </span>
            <span
              className="text-[1.1rem] font-bold font-serif"
              style={{ color: currentMark != null ? colorBase : "#9b9b94" }}
            >
              {currentMark != null ? `${currentMark.toFixed(1)}%` : "\u2014"}
            </span>
            {currentMark != null && bandKey && (
              <span
                className="ml-auto text-[0.62rem] font-bold px-[6px] py-[2px] rounded-[4px]"
                style={{ backgroundColor: colorSoft, color: colorBase }}
              >
                {t(bandKey)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-[8px]">
            <span className="text-[0.66rem] font-medium text-[#9b9b94] flex-shrink-0">
              {`${Math.round(completedWeight * 100)}% ${t("assessedSuffix")}`}
            </span>
            <ProgressBarFill progress={completedWeight} color={colorBase} />
          </div>
        </div>
      </div>
    </div>
  );
}
