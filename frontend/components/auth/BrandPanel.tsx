"use client";

import { Target, Radio, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

const features = [
  {
    icon: Target,
    titleKey: "auth.brand.gpaTracking",
    descKey: "auth.brand.gpaTrackingDesc",
    iconBg: "bg-[rgba(217,119,87,0.11)]",
    iconColor: "text-[#d97757]",
  },
  {
    icon: Radio,
    titleKey: "auth.brand.smartDigest",
    descKey: "auth.brand.smartDigestDesc",
    iconBg: "bg-[rgba(106,155,204,0.11)]",
    iconColor: "text-[#6a9bcc]",
  },
  {
    icon: Calendar,
    titleKey: "auth.brand.deadlineIntel",
    descKey: "auth.brand.deadlineIntelDesc",
    iconBg: "bg-[rgba(120,140,93,0.11)]",
    iconColor: "text-[#788c5d]",
  },
];

export default function BrandPanel() {
  const t = useTranslations();

  return (
    <div className="hidden min-[900px]:flex flex-col items-center justify-center max-w-[360px]">
      {/* Logo mark + brand name */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-[52px] h-[52px] bg-[#d97757] rounded-[14px] grid place-items-center font-serif font-bold text-[26px] text-white shrink-0">
          U
        </div>
        <span className="font-serif text-[2rem] font-bold text-text-1 tracking-[-0.02em]">
          UniBoard
        </span>
      </div>

      {/* Tagline */}
      <p className="font-serif text-[1.1rem] text-text-2 leading-[1.65] text-center max-w-[320px] mb-10">
        {t("auth.brand.tagline")}
      </p>

      {/* Feature highlights */}
      <div className="flex flex-col gap-3.5 max-w-[300px]">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.titleKey}
              className="flex items-start gap-3 px-4 py-3 rounded-lg bg-card-bg/60 border border-card-border/50"
            >
              <div
                className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${feature.iconBg} ${feature.iconColor}`}
              >
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <div className="text-[0.82rem] font-semibold text-text-1 mb-0.5">
                  {t(feature.titleKey)}
                </div>
                <div className="text-[0.72rem] text-text-3 leading-[1.45]">
                  {t(feature.descKey)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
