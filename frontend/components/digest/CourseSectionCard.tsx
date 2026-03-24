"use client";

import { useTranslations } from "next-intl";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import HighlightItem from "./HighlightItem";

interface CourseSectionCardProps {
  code: string;
  name?: string;
  highlights: Array<{
    type: string;
    summary: string;
    urgency: string;
    source_thread_id?: string;
    created_at?: string;
  }>;
  delay?: number;
}

/**
 * Course section card with left color stripe, header
 * (dot, code, name, count badge), and highlight list.
 */
export default function CourseSectionCard({
  code,
  name,
  highlights,
  delay,
}: CourseSectionCardProps) {
  const t = useTranslations("digest");
  const courseColor = getCourseColor(code);

  return (
    <AnimatedEntry delay={delay ?? 3}>
      <div className="relative">
        <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)] overflow-hidden relative hover:shadow-[0_2px_8px_rgba(20,20,19,0.06),0_8px_24px_rgba(20,20,19,0.04)] transition-shadow duration-150">
          {/* Left color stripe */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[5px] z-[3]"
            style={{ backgroundColor: courseColor.base }}
          />

          {/* Header */}
          <div className="py-[16px] px-[20px] pl-[24px] flex items-center gap-[12px] border-b border-[#eae7e0]">
            <div
              className="w-[10px] h-[10px] rounded-full flex-shrink-0"
              style={{ backgroundColor: courseColor.base }}
            />
            <span className="font-serif font-semibold text-[0.95rem] text-[#2d2d2a]">
              {code}
            </span>
            {name && (
              <span className="text-[0.72rem] text-[#9b9b94] ml-[2px]">
                &mdash; {name}
              </span>
            )}
            <span
              className="text-[0.62rem] font-semibold py-[2px] px-[8px] rounded-[5px] ml-auto whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: courseColor.soft,
                color: courseColor.base,
              }}
            >
              {highlights.length}{" "}
              {highlights.length === 1 ? t("update") : t("updates")}
            </span>
          </div>

          {/* Highlights list */}
          <div className="py-[6px] px-[20px] pl-[24px]">
            {highlights.map((hl, i) => (
              <HighlightItem
                key={i}
                type={hl.type}
                summary={hl.summary}
                urgency={hl.urgency}
                sourceThreadId={hl.source_thread_id}
                createdAt={hl.created_at}
                courseCode={code}
              />
            ))}
          </div>
        </div>
      </div>
    </AnimatedEntry>
  );
}
