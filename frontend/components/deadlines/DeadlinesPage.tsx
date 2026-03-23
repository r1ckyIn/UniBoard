"use client";

import { useTranslations } from "next-intl";

export default function DeadlinesPage() {
  const t = useTranslations("deadlines");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[1.5rem] font-bold font-serif tracking-[-0.02em] text-[#2d2d2a]">
        {t("title")}
      </h1>
    </div>
  );
}
