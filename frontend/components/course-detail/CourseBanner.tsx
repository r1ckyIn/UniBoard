"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { withClientOnly } from "@/components/design-system/ClientOnly";

const BannerDecoClient = withClientOnly(
  () => import("@/components/courses/BannerDeco")
);

interface CourseBannerProps {
  courseCode: string;
  courseName: string;
  semester: string;
  creditPoints: number;
  courseColor: string;
  patternIndex: number;
}

/**
 * Full-width course banner with hand-drawn border, colour strip,
 * course info, and decorative Rough.js doodle overlay.
 */
export default function CourseBanner({
  courseCode,
  courseName,
  semester,
  creditPoints,
  courseColor,
  patternIndex,
}: CourseBannerProps) {
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

  // Compute a slightly darker shade for gradient end
  const darkerShade = courseColor
    .replace(/^#/, "")
    .match(/.{2}/g)
    ?.map((hex) =>
      Math.max(0, parseInt(hex, 16) - 20)
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

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
        {/* Banner colour strip */}
        <div
          className="relative w-full px-[32px] py-[28px] flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${courseColor}, #${darkerShade || courseColor.slice(1)})`,
          }}
        >
          {/* Decorative doodle overlay */}
          <BannerDecoClient
            patternIndex={patternIndex}
            width={300}
            height={120}
          />

          {/* Left: course code + name */}
          <div className="relative z-[1]">
            <div
              className="banner-code font-serif text-[2rem] font-bold text-white leading-[1.15] tracking-[-0.02em]"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,.15)" }}
            >
              {courseCode}
            </div>
            <div
              className="text-[0.92rem] font-medium text-white/[.88] mt-[4px]"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,.1)" }}
            >
              {courseName}
            </div>
          </div>

          {/* Right: semester + credit points tags */}
          <div className="relative z-[1] flex flex-col items-end gap-[6px]">
            <span className="text-[0.72rem] font-semibold px-[12px] py-[4px] rounded-[6px] bg-white/20 text-white backdrop-blur-[4px] whitespace-nowrap">
              {semester}
            </span>
            <span className="text-[0.72rem] font-semibold px-[12px] py-[4px] rounded-[6px] bg-white/20 text-white backdrop-blur-[4px] whitespace-nowrap">
              {creditPoints} cp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
