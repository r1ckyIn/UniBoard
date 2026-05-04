"use client";

import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";

/**
 * Small language toggle button for the auth page top-right corner.
 * Switches between EN and ZH using next-intl routing.
 * Preserves URL search params (e.g., ?mode=register) across locale switches.
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "zh" : "en";
    // Read search params at click time to avoid subscribing to URL changes
    const search = typeof window !== "undefined" ? window.location.search : "";
    const fullPath = search ? `${pathname}${search}` : pathname;
    router.replace(fullPath, { locale: nextLocale });
  };

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card-bg/80 backdrop-blur-sm border border-divider text-text-2 hover:text-text-1 hover:bg-card-bg transition-colors [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
      aria-label={`Switch to ${locale === "en" ? "Chinese" : "English"}`}
    >
      <Globe size={14} />
      {locale.toUpperCase()}
    </button>
  );
}
