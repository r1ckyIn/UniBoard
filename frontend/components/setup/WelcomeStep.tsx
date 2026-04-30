"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Lock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/auth/store";

interface WelcomeStepProps {
  onNext: () => void;
}

const FEATURE_BADGES = [
  {
    icon: ShieldCheck,
    key: "readonly" as const,
    bg: "bg-[rgba(217,119,87,.11)]",
    color: "text-[#d97757]",
  },
  {
    icon: Lock,
    key: "encrypted" as const,
    bg: "bg-[rgba(106,155,204,.11)]",
    color: "text-[#6a9bcc]",
  },
  {
    icon: Trash2,
    key: "deletable" as const,
    bg: "bg-[rgba(120,140,93,.11)]",
    color: "text-[#788c5d]",
  },
] as const;

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  const t = useTranslations("setup.welcome");
  const userEmail = useAuthStore((s) => s.user?.email) ?? "";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-[60px] h-[60px] bg-[#d97757] rounded-2xl flex items-center justify-center">
        <span className="font-serif text-[30px] font-semibold text-white leading-none">
          U
        </span>
      </div>

      <h1 className="text-[28px] font-serif font-semibold leading-[1.2] text-text-1 mt-5">
        {t("title")}
      </h1>

      <p className="text-base text-text-2 leading-[1.6] max-w-[420px] mx-auto mt-3">
        {t("description")}
      </p>

      <p className="text-base italic text-text-3 mt-2">{t("subtitle")}</p>

      {userEmail !== "" && (
        <p
          className="text-[0.81rem] text-text-3 mt-3"
          data-testid="welcome-signed-in-note"
        >
          {t("signedInAs", { email: userEmail })}{" "}
          {t("firstTimeNote")}
        </p>
      )}

      <div
        className={cn(
          "flex items-center justify-center gap-4 mt-6",
          "max-[680px]:flex-col",
        )}
      >
        {FEATURE_BADGES.map(({ icon: Icon, key, bg, color }) => (
          <div
            key={key}
            className={cn(
              "flex flex-col items-center gap-2",
              "max-[680px]:flex-row max-[680px]:gap-3",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                bg,
              )}
            >
              <Icon size={18} className={color} />
            </div>
            <span className="text-sm font-semibold text-text-2">
              {t(`features.${key}`)}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 bg-[#d97757] hover:bg-[#c5674a] text-white font-semibold py-3 px-10 rounded-lg transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] hover:-translate-y-px"
      >
        {t("cta")}
      </button>
    </div>
  );
}
