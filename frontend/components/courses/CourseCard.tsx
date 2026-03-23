"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { getGradeBand } from "@/lib/utils/grade-band";
import { withClientOnly } from "@/components/design-system/ClientOnly";

// SSR-safe dynamic imports for Rough.js components
const BannerDecoClient = withClientOnly(
  () => import("@/components/courses/BannerDeco")
);
const RoughProgressBarClient = withClientOnly(
  () => import("@/components/dashboard/RoughProgressBar")
);

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

// Duration (ms) for the rAF burst that tracks layout animation resizes
const RESIZE_BURST_DURATION = 400;

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

    // Clear previous SVG children before drawing
    svg.replaceChildren();

    const rc = rough.svg(svg);
    const rect = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1.0,
      bowing: 1,
      fill: "none",
      seed: 42,
    });
    svg.appendChild(rect);
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

    let burstRafId: number | null = null;

    const observer = new ResizeObserver(() => {
      // Cancel any ongoing burst to avoid stacking loops
      if (burstRafId !== null) cancelAnimationFrame(burstRafId);

      // Start a rAF burst that redraws the border every frame for RESIZE_BURST_DURATION ms
      const start = performance.now();
      const loop = () => {
        drawBorder();
        if (performance.now() - start < RESIZE_BURST_DURATION) {
          burstRafId = requestAnimationFrame(loop);
        } else {
          burstRafId = null;
        }
      };
      loop();
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
      observer.disconnect();
      if (burstRafId !== null) cancelAnimationFrame(burstRafId);
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
      {/* Hand-drawn SVG border */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[10] overflow-visible"
      />

      {/* Inner card */}
      <div className="bg-[#f6f5f0] overflow-hidden shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)]">
        {/* Banner section */}
        <div className="relative h-[120px] overflow-hidden">
          {/* Background color layer */}
          <div className="absolute inset-0" style={{ backgroundColor: colorBase }} />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.35) 100%)",
            }}
          />

          {/* Banner deco pattern */}
          <BannerDecoClient
            patternIndex={decoIndex}
            width={300}
            height={120}
          />

          {/* Text overlay */}
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

        {/* Info section */}
        <div className="p-[14px_18px_16px]">
          {/* Term row */}
          <div className="text-[0.7rem] font-medium text-[#9b9b94] mb-[8px]">
            {t("termPrefix")} {semester}
          </div>

          {/* Grade row */}
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
                className="text-[0.62rem] font-bold px-[6px] py-[2px] rounded-[4px]"
                style={{ backgroundColor: colorSoft, color: colorBase }}
              >
                {t(bandKey)}
              </span>
            )}
          </div>

          {/* Progress row */}
          <div className="flex items-center gap-[8px]">
            <RoughProgressBarClient
              progress={completedWeight}
              color={colorBase}
              width={160}
              height={10}
            />
            <span className="text-[0.66rem] font-medium text-[#9b9b94]">
              {`${Math.round(completedWeight * 100)}% ${t("assessedSuffix")}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
