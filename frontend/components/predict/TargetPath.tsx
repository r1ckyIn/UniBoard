"use client";

import { useState, useCallback } from "react";
import { Target, Check, X } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useTargetPath } from "@/lib/hooks/usePredict";
import type { TargetPathResponse, AssessmentTarget } from "@/lib/api/types";

/**
 * Color code a required score for visual difficulty indication.
 * Green < 70 (easy), Amber 70-85 (moderate), Red > 85 (hard).
 */
function scoreColor(score: number): string {
  if (score < 70) return "var(--color-green)";
  if (score <= 85) return "var(--color-amber)";
  return "var(--color-orange)";
}

/**
 * Target GPA path calculator.
 * User enters a target WAM, submits to the API, and sees the minimum
 * required scores per ungraded assessment to reach that target.
 */
export default function TargetPath() {
  const [targetWam, setTargetWam] = useState<number>(75);
  const targetMutation = useTargetPath();
  const result: TargetPathResponse | undefined = targetMutation.data;

  const handleCalculate = useCallback(() => {
    targetMutation.mutate({ target_wam: targetWam, mode: "uniform" });
  }, [targetWam, targetMutation]);

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Target size={20} style={{ color: "var(--color-orange)" }} />
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Target Path
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-3)" }}>
        Find the minimum scores needed to reach your target WAM
      </p>

      {/* Target WAM input */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm" style={{ color: "var(--color-text-2)" }}>
          Target WAM:
        </label>
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={targetWam}
          onChange={(e) => setTargetWam(Number(e.target.value))}
          className="w-[80px] text-sm text-right px-2 py-1.5 rounded-[var(--radius-sm)]"
          style={{
            fontFamily: "monospace",
            border: "1px solid var(--color-card-border)",
            background: "var(--color-cream)",
            color: "var(--color-text-1)",
          }}
        />
        <button
          onClick={handleCalculate}
          disabled={targetMutation.isPending}
          className="px-4 py-1.5 text-sm rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50"
          style={{
            background: "var(--color-orange)",
            color: "white",
          }}
        >
          {targetMutation.isPending ? "Calculating..." : "Calculate"}
        </button>
      </div>

      {/* Results */}
      {targetMutation.isError && (
        <p className="text-sm" style={{ color: "var(--color-orange)" }}>
          Failed to calculate target path. Please try again.
        </p>
      )}

      {result && (
        <div>
          {/* Achievability badge */}
          <div className="flex items-center gap-2 mb-3">
            {result.is_achievable ? (
              <span
                className="flex items-center gap-1 text-sm px-2 py-1 rounded"
                style={{
                  background: "var(--color-green-soft)",
                  color: "var(--color-green)",
                }}
              >
                <Check size={14} />
                Achievable
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-sm px-2 py-1 rounded"
                style={{
                  background: "var(--color-orange-soft)",
                  color: "var(--color-orange)",
                }}
              >
                <X size={14} />
                Not achievable
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
              Maximum achievable WAM: {result.max_achievable_wam.toFixed(1)}
            </span>
          </div>

          {/* Required scores table */}
          {result.required_scores.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--color-divider)",
                      color: "var(--color-text-3)",
                    }}
                  >
                    <th className="text-left py-2 font-medium">Course</th>
                    <th className="text-left py-2 font-medium">Assessment</th>
                    <th className="text-right py-2 font-medium">Min Score</th>
                    <th className="text-right py-2 font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {result.required_scores.map((item: AssessmentTarget) => (
                    <tr
                      key={item.assessment_id}
                      style={{ borderBottom: "1px solid var(--color-divider)" }}
                    >
                      <td className="py-2" style={{ color: "var(--color-text-2)" }}>
                        {item.course_code}
                      </td>
                      <td className="py-2">{item.assessment_name}</td>
                      <td
                        className="py-2 text-right font-medium tabular-nums"
                        style={{
                          fontFamily: "monospace",
                          color: scoreColor(item.required_score),
                        }}
                      >
                        {item.required_score.toFixed(1)}
                      </td>
                      <td
                        className="py-2 text-right tabular-nums"
                        style={{
                          fontFamily: "monospace",
                          color: "var(--color-text-3)",
                        }}
                      >
                        {Math.round(item.weight * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </RoughCard>
  );
}
