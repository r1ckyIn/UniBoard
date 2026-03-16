"use client";

import { useState, useCallback } from "react";
import { BookmarkCheck, BarChart3 } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useWhatIfScenarios } from "@/lib/hooks/usePredict";
import { usePredictorStore } from "@/lib/stores/predictor";
import { gradeBand } from "@/lib/utils/gpa";
import { formatRelative } from "@/lib/utils/dates";
import type { WhatIfScenarioResponse } from "@/lib/api/types";

/**
 * Saved scenario list with load-into-store and side-by-side comparison.
 */
export default function ScenarioList() {
  const { data: scenarios, isLoading } = useWhatIfScenarios();
  const loadScenario = usePredictorStore((s) => s.loadScenario);

  // Comparison mode: track up to 2 selected scenario IDs
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const handleLoad = useCallback(
    (scenario: WhatIfScenarioResponse) => {
      loadScenario(scenario.name, scenario.scores);
    },
    [loadScenario]
  );

  if (isLoading) {
    return (
      <RoughCard
        className="p-6 rounded-[var(--radius-card)]"
        style={{ background: "var(--color-card-bg)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          Loading saved scenarios...
        </p>
      </RoughCard>
    );
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <RoughCard
        className="p-6 rounded-[var(--radius-card)]"
        style={{ background: "var(--color-card-bg)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <BookmarkCheck size={20} style={{ color: "var(--color-text-3)" }} />
          <h3
            className="text-lg"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Saved Scenarios
          </h3>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          No saved scenarios yet. Use the simulator above to create one.
        </p>
      </RoughCard>
    );
  }

  const compareScenarios =
    compareIds.length === 2
      ? scenarios.filter((s) => compareIds.includes(s.id))
      : null;

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <BookmarkCheck size={20} style={{ color: "var(--color-orange)" }} />
        <h3
          className="text-lg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Saved Scenarios
        </h3>
        {compareIds.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded" style={{
            background: "var(--color-blue-soft)",
            color: "var(--color-blue)",
          }}>
            {compareIds.length}/2 selected
          </span>
        )}
      </div>

      {/* Scenario cards */}
      <div className="space-y-2 mb-4">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] cursor-pointer transition-colors"
            style={{
              border: compareIds.includes(s.id)
                ? "1px solid var(--color-blue)"
                : "1px solid var(--color-divider)",
              background: compareIds.includes(s.id)
                ? "var(--color-blue-soft)"
                : "transparent",
            }}
            onClick={() => handleLoad(s)}
          >
            <div>
              <span className="text-sm font-medium">{s.name}</span>
              <span className="text-xs ml-2" style={{ color: "var(--color-text-3)" }}>
                {formatRelative(s.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span
                  className="text-sm font-medium tabular-nums"
                  style={{ fontFamily: "monospace" }}
                >
                  WAM {s.result_wam.toFixed(1)}
                </span>
                <span
                  className="text-xs ml-1"
                  style={{ color: "var(--color-text-3)" }}
                >
                  ({gradeBand(s.result_wam)})
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompare(s.id);
                }}
                className="p-1 rounded cursor-pointer"
                style={{
                  color: compareIds.includes(s.id)
                    ? "var(--color-blue)"
                    : "var(--color-text-3)",
                }}
                title="Select for comparison"
              >
                <BarChart3 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison view */}
      {compareScenarios && (
        <div
          className="p-3 rounded-[var(--radius-sm)]"
          style={{ background: "var(--color-cream)" }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-3)" }}>
            Comparison
          </p>
          <div className="grid grid-cols-2 gap-4">
            {compareScenarios.map((s) => (
              <div key={s.id} className="text-center">
                <p className="text-sm font-medium mb-1">{s.name}</p>
                <p
                  className="text-xl font-semibold tabular-nums"
                  style={{ fontFamily: "monospace" }}
                >
                  {s.result_wam.toFixed(1)}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                  GPA {s.result_gpa.toFixed(2)} ({gradeBand(s.result_wam)})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </RoughCard>
  );
}
