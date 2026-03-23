"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import rough from "roughjs";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCourseDiscussions } from "@/hooks/use-discussions";
import ExternalLinkDialog from "@/components/dashboard/ExternalLinkDialog";

interface EdPostsPanelProps {
  courseId: string;
  edCourseId: string;
}

/**
 * Right panel card showing high-value Ed Discussion posts
 * (endorsed or staff-answered) with badges and relative time.
 */
export default function EdPostsPanel({
  courseId,
  edCourseId,
}: EdPostsPanelProps) {
  const t = useTranslations("courseDetail");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { data, isLoading } = useCourseDiscussions(courseId, "high_value");

  // Track which post's dialog is open
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

  const discussions = data?.data ?? [];

  /**
   * Format relative time for a post creation date.
   */
  function formatTime(createdAt: string): string {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return createdAt;
    }
  }

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
          <MessageCircle size={16} className="text-[#d97757]" />
          {t("edPosts.title")}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-[10px] px-[10px] py-[8px]"
              >
                <div className="flex-1 h-[14px] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
                <div className="w-[50px] h-[14px] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && discussions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-[24px] text-[#9b9b94]">
            <MessageCircle size={20} className="mb-[6px]" />
            <span className="text-[0.84rem]">{t("edPosts.empty")}</span>
          </div>
        )}

        {/* Post list */}
        {!isLoading && discussions.length > 0 && (
          <div>
            {discussions.map((d, i) => (
              <div key={d.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenUrl(
                      `https://edstem.org/au/courses/${edCourseId}/discussion/${d.ed_thread_id}`
                    )
                  }
                  className="flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px] hover:bg-[var(--card-bg-hover)] cursor-pointer w-full text-left transition-colors"
                >
                  {/* Title */}
                  <span className="text-[0.78rem] font-semibold text-[var(--text-1)] truncate flex-1">
                    {d.title}
                  </span>

                  {/* Badges */}
                  <span className="flex items-center gap-[4px] flex-shrink-0">
                    {d.is_endorsed && (
                      <span className="text-[0.58rem] font-bold bg-[rgba(120,140,93,.11)] text-[#788c5d] rounded-[4px] px-[6px] py-[1px]">
                        {t("edPosts.endorsed")}
                      </span>
                    )}
                    {d.is_staff_post && (
                      <span className="text-[0.58rem] font-bold bg-[rgba(106,155,204,.11)] text-[#6a9bcc] rounded-[4px] px-[6px] py-[1px]">
                        {t("edPosts.staffPost")}
                      </span>
                    )}
                  </span>

                  {/* Time */}
                  <span className="text-[0.64rem] text-[var(--text-3)] flex-shrink-0">
                    {formatTime(d.created_at)}
                  </span>
                </button>
                {i < discussions.length - 1 && (
                  <div className="border-b border-[var(--divider)]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared ExternalLinkDialog */}
      <ExternalLinkDialog
        open={openUrl !== null}
        url={openUrl ?? ""}
        onConfirm={() => setOpenUrl(null)}
        onCancel={() => setOpenUrl(null)}
      />
    </div>
  );
}
