"use client";

import { useTranslations } from "next-intl";
import { BookOpen, AlertCircle } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import CourseCard from "@/components/courses/CourseCard";

export default function CoursesPage() {
  const t = useTranslations("courses");
  const { data, isLoading, isError } = useCourses();
  const courseList = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AnimatedEntry delay={1}>
        <div className="flex items-center justify-between mb-[4px]">
          <div className="flex items-center gap-[8px]">
            <BookOpen size={20} className="text-[#d97757]" />
            <h1 className="text-[1.5rem] font-bold font-serif tracking-[-0.02em] text-[#2d2d2a]">
              {t("title")}
            </h1>
            <span className="text-[0.68rem] font-semibold bg-[rgba(217,119,87,.1)] text-[#d97757] px-[8px] py-[3px] rounded-[6px]">
              {courseList.length > 0 ? courseList[0].semester : "2026 S1"}
            </span>
          </div>
          <span className="text-[0.7rem] font-semibold text-[#6b6b65] bg-[#f6f5f0] border border-[#e8e5dd] px-[10px] py-[4px] rounded-[6px]">
            {t("filterBadge", { count: String(courseList.length) })}
          </span>
        </div>
      </AnimatedEntry>

      {isLoading && (
        <div className="grid grid-cols-1 min-[900px]:grid-cols-2 min-[1400px]:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#f6f5f0] rounded-[4px] border border-[#e8e5dd] shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)] overflow-hidden"
            >
              <div className="h-[120px] animate-skeleton-shimmer bg-[length:200%_100%] bg-[#ede9e1] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              <div className="p-[14px_18px_16px]">
                <div className="h-3 w-20 rounded-[6px] mb-[8px] animate-skeleton-shimmer bg-[length:200%_100%] bg-[#ede9e1] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
                <div className="h-4 w-32 rounded-[6px] mb-[8px] animate-skeleton-shimmer bg-[length:200%_100%] bg-[#ede9e1] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
                <div className="h-2.5 w-40 rounded-[6px] animate-skeleton-shimmer bg-[length:200%_100%] bg-[#ede9e1] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle size={32} className="text-[#d97757]" />
          <p className="text-[0.85rem] text-[#6b6b65]">{t("errorMessage")}</p>
        </div>
      )}

      {!isLoading && !isError && courseList.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12">
          <BookOpen size={48} className="text-[#9b9b94]" />
          <h2 className="text-[1.1rem] font-semibold font-serif text-[#2d2d2a]">
            {t("emptyTitle")}
          </h2>
          <p className="text-[0.85rem] text-[#6b6b65]">{t("emptyBody")}</p>
        </div>
      )}

      {!isLoading && !isError && courseList.length > 0 && (
        <div className="grid grid-cols-1 min-[900px]:grid-cols-2 min-[1400px]:grid-cols-3 gap-5">
          {courseList.map((course, index) => {
            const { base, soft } = getCourseColor(course.code);
            // Cap delay at 6 (max useful value in AnimatedEntry DELAY_MAP)
            const delay = Math.min(index + 2, 6) as 1 | 2 | 3 | 4 | 5 | 6;
            return (
              <AnimatedEntry key={course.id} delay={delay}>
                <CourseCard
                  id={course.id}
                  name={course.name}
                  code={course.code}
                  semester={course.semester}
                  currentMark={course.current_mark ?? null}
                  completedWeight={course.completed_weight ?? 0}
                  colorBase={base}
                  colorSoft={soft}
                  decoIndex={index}
                />
              </AnimatedEntry>
            );
          })}
        </div>
      )}
    </div>
  );
}
