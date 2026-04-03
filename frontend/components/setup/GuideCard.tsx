"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ExternalLink, Settings, Key, Copy } from "lucide-react";
import { PLATFORM_CONFIG } from "./platform-config";

interface GuideCardProps {
  platform: "canvas" | "ed";
  defaultExpanded?: boolean;
}

const STEP_ICONS = {
  canvas: [ExternalLink, Settings, Key, Key, Copy],
  ed: [ExternalLink, ExternalLink, Key, Settings, Copy],
} as const;

const GUIDE_CONFIG = {
  canvas: { nameKey: "canvas.name" as const, stepsPrefix: "canvas.steps" as const },
  ed: { nameKey: "ed.name" as const, stepsPrefix: "ed.steps" as const },
} as const;

export default function GuideCard({
  platform,
  defaultExpanded = true,
}: GuideCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const t = useTranslations("setup.tutorial");

  const base = PLATFORM_CONFIG[platform];
  const guide = GUIDE_CONFIG[platform];
  const PlatformIcon = base.icon;
  const stepIcons = STEP_ICONS[platform];

  return (
    <div className="border border-card-border rounded-2xl p-5 px-6">
      <div
        role="button"
        tabIndex={0}
        aria-label={t(guide.nameKey)}
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: base.iconBg }}
          >
            <PlatformIcon size={16} style={{ color: base.iconColor }} />
          </div>
          <span className="font-serif text-[21px] font-semibold text-text-1">
            {t(guide.nameKey)}
          </span>
        </div>

        <ChevronDown
          size={18}
          className="text-text-3"
          style={{
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>

      <div
        data-testid="guide-content"
        aria-hidden={!expanded}
        style={{
          maxHeight: expanded ? "500px" : "0px",
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition:
            "max-height 0.35s cubic-bezier(.4,0,.2,1), opacity 0.25s ease",
        }}
      >
        <div className="mt-4 flex flex-col gap-3">
          {stepIcons.map((StepIcon, index) => {
            const stepNum = index + 1;
            return (
              <div key={stepNum} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#d97757] text-white text-sm font-semibold rounded-full flex items-center justify-center flex-shrink-0">
                  {stepNum}
                </div>
                <StepIcon
                  size={14}
                  className="text-text-3 mt-[3px] flex-shrink-0"
                />
                <span className="text-base text-text-2 leading-[1.5]">
                  {t(`${guide.stepsPrefix}.${stepNum}` as Parameters<typeof t>[0])}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
