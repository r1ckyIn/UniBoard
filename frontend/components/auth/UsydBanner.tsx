"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Info, X } from "lucide-react";

interface UsydBannerProps {
  storageKey?: string;
  reShowAfterDays?: number;
}

const DEFAULT_STORAGE_KEY = "uniboard.banner.usydRegister";
const DEFAULT_RE_SHOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function UsydBanner({
  storageKey = DEFAULT_STORAGE_KEY,
  reShowAfterDays = DEFAULT_RE_SHOW_DAYS,
}: UsydBannerProps) {
  const t = useTranslations("auth.usydBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(storageKey);
    if (!dismissed) {
      setVisible(true);
      return;
    }
    const dismissedAt = Date.parse(dismissed);
    if (Number.isNaN(dismissedAt)) {
      setVisible(true);
      return;
    }
    const ageMs = Date.now() - dismissedAt;
    setVisible(ageMs > reShowAfterDays * DAY_MS);
  }, [storageKey, reShowAfterDays]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="relative mb-4 flex items-start gap-2.5 rounded-lg border border-[rgba(217,119,87,0.2)] bg-[rgba(217,119,87,0.06)] p-3 pr-8 text-[0.81rem] text-text-1"
    >
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-[#d97757]"
        aria-hidden
      />
      <div className="leading-snug">{t("body")}</div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t("dismiss")}
        className="absolute right-2 top-2 rounded p-1 text-text-3 hover:bg-cream-2 hover:text-text-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
