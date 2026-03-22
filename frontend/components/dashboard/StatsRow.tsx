"use client";

import { useTranslations } from "next-intl";
import RoughCard from "@/components/design-system/RoughCard";
import RoughNotationWrapper from "@/components/design-system/RoughNotationWrapper";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

interface StatsRowProps {
  wam: number;
  target: number;
  gradeBand: string;
  alertCount: number;
  alertSummary: string;
}

export default function StatsRow({
  wam,
  target,
  gradeBand,
  alertCount,
  alertSummary,
}: StatsRowProps) {
  const t = useTranslations("dashboard");
  const gap = Math.abs(target - wam).toFixed(1);

  // Parse alertSummary to extract course and count for i18n
  // Format expected: "COMP2017" and count as a number
  // For now, pass raw alertSummary parts
  const alertParts = alertSummary.split(" · ");
  const alertCourse = alertParts[0] || "";
  const alertDeadlineCount = alertParts[1] || "";

  return (
    <div className="grid grid-cols-3 gap-5">
      {/* WAM Card */}
      <AnimatedEntry delay={1}>
        <RoughCard padding="py-5 px-6 pl-8" disableHover>
          <p
            className="text-text-3 mb-2 uppercase"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {t("stats.wam.label")}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <RoughNotationWrapper
              type="circle"
              color="#d97757"
              strokeWidth={1.2}
              padding={10}
              show
              delay={2200}
              animationDuration={800}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: "2rem",
                  fontWeight: 600,
                  lineHeight: 1.1,
                  color: "var(--color-orange)",
                }}
              >
                {wam.toFixed(1)}
              </span>
            </RoughNotationWrapper>
            <span
              className="rounded"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "1px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--color-orange-soft)",
                color: "var(--color-orange)",
              }}
            >
              D
            </span>
          </div>
          <p className="text-text-2" style={{ fontSize: "12px" }}>
            {t("stats.wam.sub")}
          </p>
        </RoughCard>
      </AnimatedEntry>

      {/* GPA Target Card */}
      <AnimatedEntry delay={2}>
        <RoughCard padding="py-5 px-6 pl-8" disableHover>
          <p
            className="text-text-3 mb-2 uppercase"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {t("stats.target.label")}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-serif"
              style={{
                fontSize: "2rem",
                fontWeight: 600,
                lineHeight: 1.1,
                color: "var(--color-blue)",
              }}
            >
              {target.toFixed(1)}
            </span>
            <span
              className="rounded"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "1px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--color-blue-soft)",
                color: "var(--color-blue)",
              }}
            >
              {t("stats.target.badge", { gap })}
            </span>
          </div>
          <p className="text-text-2" style={{ fontSize: "12px" }}>
            {t("stats.target.sub", { gradeBand })}
          </p>
        </RoughCard>
      </AnimatedEntry>

      {/* Alerts Card */}
      <AnimatedEntry delay={3}>
        <RoughCard padding="py-5 px-6 pl-8" disableHover>
          <p
            className="text-text-3 mb-2 uppercase"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {t("stats.alerts.label")}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-serif"
              style={{
                fontSize: "2rem",
                fontWeight: 600,
                lineHeight: 1.1,
                color: "var(--color-amber)",
              }}
            >
              {alertCount}
            </span>
          </div>
          <p className="text-text-2" style={{ fontSize: "12px" }}>
            {t("stats.alerts.sub", {
              course: alertCourse,
              count: alertDeadlineCount,
            })}
          </p>
        </RoughCard>
      </AnimatedEntry>
    </div>
  );
}
