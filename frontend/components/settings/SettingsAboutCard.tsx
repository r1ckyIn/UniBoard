"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { format } from "date-fns";
import type { components } from "@/lib/api/types.gen";
import RoughCard from "@/components/design-system/RoughCard";

type User = components["schemas"]["User"];

interface SettingsAboutCardProps {
  user: User;
}

/**
 * Right panel about card — version, member since, data stored, footer links.
 */
export default function SettingsAboutCard({ user }: SettingsAboutCardProps) {
  const t = useTranslations("settings");

  return (
    <RoughCard>
      {/* Title */}
      <div className="text-[0.82rem] font-semibold flex items-center gap-[7px] mb-[14px] text-[#2d2d2a]">
        <Info size={16} className="text-[#d97757]" />
        {t("rightPanel.about")}
      </div>

      {/* Info rows */}
      <div className="text-[0.76rem] text-[#9b9b94] flex flex-col gap-[6px]">
        <div className="flex justify-between">
          <span>{t("rightPanel.version")}</span>
          <span className="font-semibold text-[#6b6b65]">1.0.0-beta</span>
        </div>
        <div className="flex justify-between">
          <span>{t("rightPanel.memberSince")}</span>
          <span className="font-semibold text-[#6b6b65]">
            {format(new Date(user.created_at), "d MMM yyyy")}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("rightPanel.dataStored")}</span>
          <span className="font-semibold text-[#6b6b65]">2.4 MB</span>
        </div>

        {/* Footer links */}
        <div className="mt-[6px] pt-[8px] border-t border-[#eae7e0] text-center">
          <a
            href="#"
            className="text-[#d97757] font-semibold text-[0.72rem] no-underline hover:underline"
          >
            Terms
          </a>
          <span className="mx-[6px] text-[#eae7e0]">&middot;</span>
          <a
            href="#"
            className="text-[#d97757] font-semibold text-[0.72rem] no-underline hover:underline"
          >
            Privacy
          </a>
          <span className="mx-[6px] text-[#eae7e0]">&middot;</span>
          <a
            href="https://github.com/r1ckyIn/UniBoard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#d97757] font-semibold text-[0.72rem] no-underline hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </RoughCard>
  );
}
