"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import rough from "roughjs";
import { useTranslations } from "next-intl";
import { ExternalLink, LayoutDashboard, MessageCircle, BookOpen } from "lucide-react";
import ExternalLinkDialog from "@/components/dashboard/ExternalLinkDialog";

interface QuickLinksPanelProps {
  courseCode: string;
  canvasCourseId: string;
  edCourseId: string;
}

interface LinkConfig {
  labelKey: "quickLinks.canvas" | "quickLinks.edDiscussion" | "quickLinks.edLessons";
  url: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}

/**
 * Right panel card showing quick external links
 * to Canvas Home, Ed Discussion, and Ed Lessons.
 */
export default function QuickLinksPanel({
  courseCode,
  canvasCourseId,
  edCourseId,
}: QuickLinksPanelProps) {
  const t = useTranslations("courseDetail");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Track which link's dialog is currently open
  const [openUrl, setOpenUrl] = useState<string | null>(null);

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

  const links: LinkConfig[] = [
    {
      labelKey: "quickLinks.canvas",
      url: `https://canvas.sydney.edu.au/courses/${canvasCourseId}`,
      icon: <LayoutDashboard size={15} />,
      bgColor: "rgba(217, 60, 50, 0.08)",
      iconColor: "#d93c32",
    },
    {
      labelKey: "quickLinks.edDiscussion",
      url: `https://edstem.org/au/courses/${edCourseId}/discussion`,
      icon: <MessageCircle size={15} />,
      bgColor: "rgba(106, 155, 204, 0.11)",
      iconColor: "#6a9bcc",
    },
    {
      labelKey: "quickLinks.edLessons",
      url: `https://edstem.org/au/courses/${edCourseId}/lessons`,
      icon: <BookOpen size={15} />,
      bgColor: "rgba(120, 140, 93, 0.11)",
      iconColor: "#788c5d",
    },
  ];

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

      <div className="bg-[#f6f5f0] px-[18px] py-[16px]">
        {/* Title */}
        <div className="text-[0.92rem] font-semibold flex items-center gap-[8px] mb-[12px]">
          <ExternalLink size={16} className="text-[#d97757]" />
          {t("quickLinks.title")}
        </div>

        {/* Link rows */}
        {links.map((link, i) => (
          <div key={link.labelKey}>
            <button
              type="button"
              onClick={() => setOpenUrl(link.url)}
              className="rp-link flex items-center gap-[10px] px-[14px] py-[10px] rounded-[8px] text-[0.82rem] font-semibold text-[var(--text-1)] cursor-pointer transition-colors hover:bg-[var(--card-bg-hover)] w-full text-left"
            >
              <div
                className="rp-link-icon w-[30px] h-[30px] rounded-[8px] grid place-items-center flex-shrink-0"
                style={{ background: link.bgColor, color: link.iconColor }}
              >
                {link.icon}
              </div>
              {t(link.labelKey)}
            </button>
            {i < links.length - 1 && (
              <div className="border-b border-[var(--divider)]" />
            )}
          </div>
        ))}
      </div>

      {/* Shared ExternalLinkDialog instance */}
      <ExternalLinkDialog
        open={openUrl !== null}
        url={openUrl ?? ""}
        onConfirm={() => setOpenUrl(null)}
        onCancel={() => setOpenUrl(null)}
      />
    </div>
  );
}
