"use client";

import { ExternalLink, Copy, Key } from "lucide-react";
import { useTranslations } from "next-intl";

interface TokenGuideProps {
  platform: "canvas" | "ed";
}

/**
 * Reusable component rendering the token retrieval tutorial
 * for a specific platform (Canvas or Ed).
 */
export default function TokenGuide({ platform }: TokenGuideProps) {
  const t = useTranslations("onboarding");

  const isCanvas = platform === "canvas";
  const titleKey = isCanvas ? "canvasGuideTitle" : "edGuideTitle";

  const steps = isCanvas
    ? [
        { key: "canvasStep1", icon: ExternalLink },
        { key: "canvasStep2", icon: Key },
        { key: "canvasStep3", icon: Key },
        { key: "canvasStep4", icon: Key },
        { key: "canvasStep5", icon: Copy },
      ] as const
    : [
        { key: "edStep1", icon: ExternalLink },
        { key: "edStep2", icon: Key },
        { key: "edStep3", icon: Key },
        { key: "edStep4", icon: Key },
        { key: "edStep5", icon: Copy },
      ] as const;

  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      <h3
        className="text-base font-semibold mb-4"
        style={{
          fontFamily: "var(--font-serif)",
          color: "var(--color-text-1)",
        }}
      >
        {t(titleKey)}
      </h3>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex items-start gap-3">
              {/* Step number */}
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: "var(--color-orange)" }}
              >
                {i + 1}
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <Icon size={14} style={{ color: "var(--color-text-3)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-2)" }}>
                  {t(step.key)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
