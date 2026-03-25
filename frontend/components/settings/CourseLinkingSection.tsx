"use client";

import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";

// Hardcoded course linking data matching prototype
const COURSES = [
  { code: "COMP2017", name: "Systems Programming", semester: "2026 S1", sources: "Canvas + Ed" },
  { code: "COMP3221", name: "Distributed Systems", semester: "2026 S1", sources: "Canvas + Ed" },
  { code: "STAT2011", name: "Probability & Estimation", semester: "2026 S1", sources: "Canvas + Ed" },
  { code: "EDGU1003", name: "Diet & Nutrition", semester: "2026 S1", sources: "Canvas only" },
  { code: "MATH2021", name: "Vector Calculus", semester: "2026 S1", sources: "Canvas + Ed" },
] as const;

/**
 * CourseLinkingSection — read-only table of synced courses and data sources.
 * Data is hardcoded matching the prototype; future phases will connect to API.
 */
export default function CourseLinkingSection() {
  const t = useTranslations("settings");

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-[8px] mb-[4px]">
        <Link2 size={18} className="text-[#6a9bcc]" />
        <h2 className="font-serif text-[1.1rem] font-semibold text-[#2d2d2a]">
          {t("courses.title")}
        </h2>
      </div>
      <p className="text-[0.82rem] text-[#9b9b94] mb-[18px]">{t("courses.desc")}</p>

      {/* Course table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["thCourse", "thSemester", "thSources", "thStatus"].map((key) => (
              <th
                key={key}
                className="text-[0.68rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] px-[10px] py-[8px] text-left border-b-[1.5px] border-[#eae7e0]"
              >
                {t(`courses.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COURSES.map((course) => (
            <tr key={course.code} className="group">
              <td className="px-[10px] py-[12px] text-[0.84rem] text-[#6b6b65] border-b border-[#eae7e0] group-last:border-b-0 align-middle">
                <span className="font-semibold text-[#2d2d2a]">{course.code}</span>
                <span className="text-[0.72rem] text-[#9b9b94] ml-[6px]">{course.name}</span>
              </td>
              <td className="px-[10px] py-[12px] text-[0.84rem] text-[#6b6b65] border-b border-[#eae7e0] group-last:border-b-0 align-middle">
                {course.semester}
              </td>
              <td className="px-[10px] py-[12px] text-[0.72rem] text-[#6b6b65] border-b border-[#eae7e0] group-last:border-b-0 align-middle">
                {course.sources}
              </td>
              <td className="px-[10px] py-[12px] border-b border-[#eae7e0] group-last:border-b-0 align-middle">
                <span className="text-[0.64rem] font-semibold px-[8px] py-[2px] rounded-[4px] bg-[rgba(120,140,93,0.11)] text-[#788c5d]">
                  {t("courses.autoLinked")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer note */}
      <p className="text-[0.72rem] text-[#9b9b94] mt-[12px] italic">
        {t("courses.manualNote")}
      </p>
    </div>
  );
}
