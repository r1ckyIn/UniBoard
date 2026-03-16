"use client";

import type { ReactNode } from "react";

interface RightPanelProps {
  children?: ReactNode;
}

/**
 * Sticky right panel (300px wide).
 * Displays per-page customized content via children prop,
 * or a default mini WAM + calendar display when no children.
 */
export default function RightPanel({ children }: RightPanelProps) {
  return (
    <aside
      className="fixed right-0 top-0 h-screen overflow-y-auto z-[50]"
      style={{
        width: "var(--right-panel-w)",
        background: "rgba(246, 245, 240, 0.6)",
        borderLeft: "1px solid var(--color-divider)",
        padding: "24px 20px",
      }}
    >
      {children ?? (
        <div className="flex flex-col gap-5">
          {/* Default content: mini WAM display */}
          <div className="text-center py-4">
            <p
              className="text-xs uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-3)" }}
            >
              Current WAM
            </p>
            <p
              className="text-3xl font-semibold"
              style={{
                fontFamily: "var(--font-serif)",
                color: "var(--color-text-1)",
              }}
            >
              --
            </p>
          </div>
          {/* Placeholder for mini calendar */}
          <div
            className="rounded-[14px] p-4"
            style={{
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-card-border)",
            }}
          >
            <p
              className="text-xs font-medium mb-2"
              style={{ color: "var(--color-text-2)" }}
            >
              Upcoming
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--color-text-3)" }}
            >
              Connect your accounts to see deadlines
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
