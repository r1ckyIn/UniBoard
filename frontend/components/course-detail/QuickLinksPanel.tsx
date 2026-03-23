"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, LayoutDashboard, MessageCircle, BookOpen } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
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

  // Track which link's dialog is currently open
  const [openUrl, setOpenUrl] = useState<string | null>(null);

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
    <>
      <RoughCard disableHover padding="px-[18px] py-[16px]">
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
      </RoughCard>

      {/* Shared ExternalLinkDialog instance - outside RoughCard to avoid clipping */}
      <ExternalLinkDialog
        open={openUrl !== null}
        url={openUrl ?? ""}
        onConfirm={() => setOpenUrl(null)}
        onCancel={() => setOpenUrl(null)}
      />
    </>
  );
}
