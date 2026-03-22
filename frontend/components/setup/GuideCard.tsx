"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ExternalLink,
  Settings,
  Key,
  Copy,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface GuideCardProps {
  platform: "canvas" | "ed";
  defaultExpanded?: boolean;
}

/** Per-step icon mapping for each platform */
const STEP_ICONS = {
  canvas: [ExternalLink, Settings, Key, Key, Copy],
  ed: [ExternalLink, ExternalLink, Key, Settings, Copy],
} as const;

const PLATFORM_CONFIG = {
  canvas: {
    icon: LayoutDashboard,
    iconBg: "rgba(217,60,50,.08)",
    iconColor: "#d93c32",
    nameKey: "canvas.name" as const,
    stepsPrefix: "canvas.steps" as const,
  },
  ed: {
    icon: MessageCircle,
    iconBg: "rgba(106,155,204,.11)",
    iconColor: "#6a9bcc",
    nameKey: "ed.name" as const,
    stepsPrefix: "ed.steps" as const,
  },
} as const;

/**
 * Collapsible platform tutorial card showing numbered steps
 * for generating API tokens from Canvas or Ed.
 */
export default function GuideCard({
  platform,
  defaultExpanded = true,
}: GuideCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const t = useTranslations("setup.tutorial");

  const config = PLATFORM_CONFIG[platform];
  const PlatformIcon = config.icon;
  const stepIcons = STEP_ICONS[platform];

  return (
    <div className="border border-card-border rounded-2xl p-5 px-6">
      {/* Clickable header */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t(config.nameKey)}
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
        {/* Left: icon + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: config.iconBg }}
          >
            <PlatformIcon size={16} style={{ color: config.iconColor }} />
          </div>
          <span className="font-serif text-[21px] font-semibold text-text-1">
            {t(config.nameKey)}
          </span>
        </div>

        {/* Right: chevron */}
        <ChevronDown
          size={18}
          className="text-text-3"
          style={{
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>

      {/* Collapsible content */}
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
                {/* Step number circle */}
                <div className="w-6 h-6 bg-[#d97757] text-white text-sm font-semibold rounded-full flex items-center justify-center flex-shrink-0">
                  {stepNum}
                </div>
                {/* Step icon (decorative) */}
                <StepIcon
                  size={14}
                  className="text-text-3 mt-[3px] flex-shrink-0"
                />
                {/* Step text */}
                <span className="text-base text-text-2 leading-[1.5]">
                  {t(`${config.stepsPrefix}.${stepNum}` as Parameters<typeof t>[0])}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
