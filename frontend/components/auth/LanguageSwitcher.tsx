"use client";

import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";

/**
 * Small language toggle button for the auth page top-right corner.
 * Switches between EN and ZH using next-intl routing.
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "zh" : "en";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card-bg/80 backdrop-blur-sm border border-divider text-text-2 hover:text-text-1 hover:bg-card-bg transition-colors duration-200"
      aria-label={`Switch to ${locale === "en" ? "Chinese" : "English"}`}
    >
      <Globe size={14} />
      {locale.toUpperCase()}
    </button>
  );
}
