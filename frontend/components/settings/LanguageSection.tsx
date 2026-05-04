"use client";

import { useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useCurrentUser, useUpdateProfile } from "@/hooks/use-user";
import { Globe } from "lucide-react";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "zh", label: "\u4e2d\u6587" },
] as const;

type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["value"];

/**
 * Language preference dropdown with English/Chinese options.
 * On change: (1) persists to backend via PATCH /users/me,
 * (2) auto-switches next-intl locale via router.replace.
 */
export default function LanguageSection() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { data: userData } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  // Use profile language_preference if available, else fall back to current locale
  const currentLang = userData?.data?.language_preference ?? locale;

  const handleLanguageChange = useCallback(
    (lang: LanguageCode) => {
      if (lang === currentLang) return;

      // 1. Persist to backend
      updateProfile.mutate(
        { language_preference: lang },
        {
          onSuccess: () => {
            // 2. Switch frontend locale via next-intl routing
            router.replace(pathname, { locale: lang });
          },
        },
      );
    },
    [updateProfile, router, pathname, currentLang],
  );

  return (
    <div>
      <div className="flex items-center gap-[8px] mb-[12px]">
        <Globe size={18} className="text-[#d97757]" />
        <span className="text-[0.82rem] text-[#6b6b65]">
          {t("language.description")}
        </span>
      </div>

      <div className="flex gap-[10px]">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleLanguageChange(option.value)}
            className={`px-[20px] py-[10px] rounded-[10px] text-[0.84rem] font-semibold border-[1.5px] transition-all duration-200 cursor-pointer ${
              currentLang === option.value
                ? "border-[#d97757] bg-[rgba(217,119,87,0.08)] text-[#d97757]"
                : "border-[#e8e5dd] bg-[#f6f5f0] text-[#6b6b65] hover:border-[#d0cdc4]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {updateProfile.isPending && (
        <p className="text-[0.72rem] text-[#9b9b94] mt-[8px] italic">
          {t("language.saving")}
        </p>
      )}
    </div>
  );
}
