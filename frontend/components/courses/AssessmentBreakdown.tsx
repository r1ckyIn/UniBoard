"use client";

import { Check, Clock } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import type { AssessmentDetail } from "@/lib/api/types";

interface AssessmentBreakdownProps {
  assessments: AssessmentDetail[];
  weightSource: string;
}

/**
 * Assessment breakdown table showing each assessment with score, weight, and status.
 * Sorted by group_name then by weight descending.
 */
export default function AssessmentBreakdown({
  assessments,
  weightSource,
}: AssessmentBreakdownProps) {
  // Sort by group_name then weight descending
  const sorted = [...assessments].sort((a, b) => {
    const groupCmp = a.group_name.localeCompare(b.group_name);
    if (groupCmp !== 0) return groupCmp;
    return b.weight - a.weight;
  });

  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Assessment Breakdown
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{ color: "var(--color-text-3)" }}
            >
              <th className="pb-3 pr-3">Assessment</th>
              <th className="pb-3 pr-3">Group</th>
              <th className="pb-3 pr-3">Score</th>
              <th className="pb-3 pr-3">Weight</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr
                key={a.id}
                className="border-t"
                style={{ borderColor: "var(--color-divider)" }}
              >
                <td
                  className="py-2.5 pr-3"
                  style={{ color: "var(--color-text-1)" }}
                >
                  {a.name}
                </td>
                <td
                  className="py-2.5 pr-3"
                  style={{ color: "var(--color-text-2)" }}
                >
                  {a.group_name}
                </td>
                <td className="py-2.5 pr-3">
                  {a.score !== null ? (
                    <span style={{ color: "var(--color-text-1)" }}>
                      {a.score}/{a.max_score}
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-text-3)" }}>--</span>
                  )}
                </td>
                <td
                  className="py-2.5 pr-3"
                  style={{ color: "var(--color-text-2)" }}
                >
                  {(a.weight * 100).toFixed(0)}%
                </td>
                <td className="py-2.5">
                  {a.score !== null ? (
                    <Check
                      size={16}
                      style={{ color: "var(--color-green)" }}
                      aria-label="graded"
                    />
                  ) : (
                    <Clock
                      size={16}
                      style={{ color: "var(--color-text-3)" }}
                      aria-label="pending"
                    />
                  )}
                </td>
              </tr>
            ))}

            {/* Total row */}
            <tr
              className="border-t font-medium"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <td className="py-2.5 pr-3" colSpan={3}>
                Total
              </td>
              <td className="py-2.5 pr-3">
                {(totalWeight * 100).toFixed(0)}%
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <p
        className="mt-3 text-xs"
        style={{ color: "var(--color-text-3)" }}
      >
        Source: {weightSource}
      </p>
    </RoughCard>
  );
}
