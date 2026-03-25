"use client";

import { useTranslations } from "next-intl";

/**
 * Centered overlay displayed when the selected week is a break week.
 * Renders on top of the timetable grid with a semi-transparent backdrop.
 */
export default function TimetableBreakMessage() {
  const t = useTranslations("timetable");

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[30]"
      style={{ background: "rgba(250,249,245,0.6)" }}
    >
      <div className="text-center p-[40px]">
        <h3 className="font-serif text-[1.2rem] mb-[6px] text-[#b08968]">
          {t("breakTitle")}
        </h3>
        <p className="text-[0.82rem] text-[#9b9b94]">
          {t("breakDesc")}
        </p>
      </div>
    </div>
  );
}
