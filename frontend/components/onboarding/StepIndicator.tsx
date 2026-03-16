"use client";

import { Check } from "lucide-react";

interface StepIndicatorProps {
  /** Total number of steps. */
  total: number;
  /** Current active step (1-based). */
  current: number;
}

/**
 * 3-circle step indicator with connecting lines.
 * Active step: orange fill. Completed: green with check. Upcoming: gray outline.
 */
export default function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isCompleted = step < current;
        const isActive = step === current;

        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{
                background: isCompleted
                  ? "var(--color-green)"
                  : isActive
                    ? "var(--color-orange)"
                    : "transparent",
                border: isCompleted || isActive
                  ? "none"
                  : "2px solid var(--color-card-border)",
                color: isCompleted || isActive
                  ? "#fff"
                  : "var(--color-text-3)",
                transition: "all 0.2s ease",
              }}
            >
              {isCompleted ? <Check size={16} /> : step}
            </div>

            {/* Connecting line */}
            {step < total && (
              <div
                className="mx-2"
                style={{
                  width: 40,
                  height: 2,
                  background: isCompleted
                    ? "var(--color-green)"
                    : "var(--color-card-border)",
                  transition: "background 0.2s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
