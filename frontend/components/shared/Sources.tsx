/**
 * Citation panel for RAG answer bubbles (AIFEAT-02 / D-B3).
 *
 * Phase 34: collapsible native <details> with [N] markers + ordered source list.
 * Pure HTML <details> — no external library, no dialog, no modal complexity.
 * React-default escaping is the XSS mitigation for source titles/anchors/excerpts
 * (threat T-34-05-01/02/03).
 */
"use client";

import { useTranslations } from "next-intl";

import type { CitationSource } from "@/lib/api/ai-stream";

interface SourcesProps {
  sources: CitationSource[];
}

export default function Sources({ sources }: SourcesProps) {
  const t = useTranslations("shared.sources");

  if (sources.length === 0) {
    return null; // No empty <details> shell
  }

  return (
    <details className="text-[0.72rem] text-[#6b6b65] mt-[8px]">
      <summary className="cursor-pointer hover:text-[#2d2d2a] transition-colors">
        {t("label", { count: sources.length })}
      </summary>
      <ol className="mt-[6px] space-y-[6px] pl-[16px]">
        {sources.map((s) => (
          <li key={s.index}>
            <span className="font-semibold">[{s.index}]</span> {s.title}
            {s.anchor ? <> &middot; {s.anchor}</> : null}
            <span className="ml-[6px] text-[#9b9b94]">
              {Math.round(s.score * 100)}%
            </span>
            {s.excerpt ? (
              <p className="italic mt-[2px]">{s.excerpt}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
