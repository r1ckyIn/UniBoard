"use client";

import { useTranslations } from "next-intl";

/**
 * Dashboard page placeholder.
 * Will be replaced with full hero + stats + grades + timeline in Plan 03-02.
 */
export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1
        className="text-3xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {t("scrollPrompt")}
      </h1>
      <p style={{ color: "var(--color-text-3)" }}>
        {t("placeholder")}
      </p>
    </div>
  );
}
