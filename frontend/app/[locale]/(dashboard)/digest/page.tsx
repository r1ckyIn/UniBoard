"use client";

import { Newspaper } from "lucide-react";
import DigestFeed from "@/components/digest/DigestFeed";

/**
 * Digest page: daily intelligence feed aggregating grades, deadlines, and Ed posts.
 * Phase 3 rule-engine version (no AI scoring).
 */
export default function DigestPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Newspaper size={24} style={{ color: "var(--color-orange)" }} />
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Your Digest
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          Recent academic activity across all your courses
        </p>
      </div>

      {/* Digest feed */}
      <DigestFeed />
    </div>
  );
}
