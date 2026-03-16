"use client";

import { Link2 } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useGPASummary } from "@/lib/hooks/useGPA";

/**
 * Simplified course linking view.
 * Shows current courses with their data source status.
 * Full manual linking UI deferred until backend linking API is available.
 */
export default function CourseLinking() {
  const { data: summary } = useGPASummary();

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Link2 size={20} style={{ color: "var(--color-blue)" }} />
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Course Linking
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-3)" }}>
        Your synced courses and data sources
      </p>

      {summary?.courses && summary.courses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)", color: "var(--color-text-3)" }}>
                <th className="text-left py-2 font-medium">Course</th>
                <th className="text-left py-2 font-medium">Semester</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.courses.map((c) => (
                <tr key={c.course_id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <td className="py-2">
                    <span className="font-medium">{c.course_code}</span>
                    <span className="ml-1 text-xs" style={{ color: "var(--color-text-3)" }}>
                      {c.course_name}
                    </span>
                  </td>
                  <td className="py-2" style={{ color: "var(--color-text-2)" }}>
                    {c.semester}
                  </td>
                  <td className="py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "var(--color-green-soft)",
                        color: "var(--color-green)",
                      }}
                    >
                      Auto-linked
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          No courses synced yet. Configure your tokens above to get started.
        </p>
      )}

      <p className="text-xs mt-3" style={{ color: "var(--color-text-3)" }}>
        Manual linking for unmatched courses coming soon.
      </p>
    </RoughCard>
  );
}
