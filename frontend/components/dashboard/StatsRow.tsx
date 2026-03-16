"use client";

import RoughCard from "@/components/design-system/RoughCard";
import { AlertTriangle } from "lucide-react";

interface StatsRowProps {
  wam?: number;
  target?: number | null;
  urgentCount: number;
}

/**
 * Three-card stats row showing current WAM, target, and urgent deadline count.
 */
export default function StatsRow({ wam, target, urgentCount }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Current WAM */}
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <p
          className="text-xs uppercase tracking-wider mb-1"
          style={{ color: "var(--color-text-3)", fontFamily: "var(--font-sans)" }}
        >
          Current WAM
        </p>
        <p
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-text-1)" }}
        >
          {wam !== undefined ? wam.toFixed(1) : "--"}
        </p>
      </RoughCard>

      {/* Target */}
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <p
          className="text-xs uppercase tracking-wider mb-1"
          style={{ color: "var(--color-text-3)", fontFamily: "var(--font-sans)" }}
        >
          Target
        </p>
        {target ? (
          <p
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-text-1)" }}
          >
            {target.toFixed(1)}
          </p>
        ) : (
          <p
            className="text-sm"
            style={{ color: "var(--color-orange)", fontFamily: "var(--font-sans)" }}
          >
            Set Target &rarr;
          </p>
        )}
      </RoughCard>

      {/* Urgent alerts */}
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <p
          className="text-xs uppercase tracking-wider mb-1"
          style={{ color: "var(--color-text-3)", fontFamily: "var(--font-sans)" }}
        >
          Alerts
        </p>
        <div className="flex items-center gap-2">
          <p
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-text-1)" }}
          >
            {urgentCount}
          </p>
          {urgentCount > 0 && (
            <AlertTriangle
              size={18}
              style={{ color: "#c0392b" }}
              aria-label="urgent deadlines"
            />
          )}
        </div>
      </RoughCard>
    </div>
  );
}
