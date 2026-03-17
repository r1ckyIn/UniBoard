"use client";

import { Trophy, Clock, MessageCircle, Star, Shield, Sparkles } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { RoughNotationItem } from "@/components/design-system/RoughNotationWrapper";
import { formatRelative } from "@/lib/utils/dates";
import type { DeadlineResponse, HighValuePostResponse } from "@/lib/api/types";
import { format, parseISO } from "date-fns";

/** Color map for deadline urgency levels */
const urgencyColors: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "var(--color-orange-soft)", text: "var(--color-orange)" },
  warning: { bg: "var(--color-amber-soft)", text: "var(--color-amber)" },
  normal: { bg: "var(--color-blue-soft)", text: "var(--color-blue)" },
  past_due: { bg: "var(--color-orange-soft)", text: "var(--color-text-3)" },
};

/** Color map for AI urgency scores (1-5) */
const urgencyBadgeColors: Record<number, string> = {
  5: "var(--color-orange)",
  4: "var(--color-amber)",
  3: "var(--color-blue)",
  2: "#95a5a6",
  1: "#bdc3c7",
};

export interface DigestDay {
  date: string; // ISO date (YYYY-MM-DD)
  grades: Array<{
    assessment_name: string;
    score: number;
    max_score: number;
    course_code: string;
    urgency_score?: number | null;
  }>;
  deadlines: DeadlineResponse[];
  posts: HighValuePostResponse[];
}

interface DigestCardProps {
  day: DigestDay;
  /** AI-generated summary for this digest (from Phase 4). */
  ai_summary?: string | null;
}

/**
 * One day's digest card. Shows grades, deadlines, and Ed posts for that date.
 * Empty sections are omitted. Cards with no data at all should not be rendered.
 */
export default function DigestCard({ day, ai_summary }: DigestCardProps) {
  const hasGrades = day.grades.length > 0;
  const hasDeadlines = day.deadlines.length > 0;
  const hasPosts = day.posts.length > 0;

  const formattedDate = format(parseISO(day.date), "EEEE, MMMM d");

  return (
    <RoughCard
      className="p-5 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      {/* Date header with hand-drawn underline */}
      <RoughNotationItem type="underline" color="var(--color-orange)" show>
        <h3
          className="text-lg mb-4 inline-block"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {formattedDate}
        </h3>
      </RoughNotationItem>

      {/* AI Summary (Phase 4) */}
      {ai_summary && (
        <div
          className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-[var(--radius-sm)]"
          style={{
            background: "rgba(99,102,241,.06)",
            border: "1px solid rgba(99,102,241,.12)",
          }}
        >
          <Sparkles size={14} className="shrink-0 mt-0.5" style={{ color: "#6366f1" }} />
          <p className="text-sm" style={{ color: "var(--color-text-2)", lineHeight: 1.5 }}>
            {ai_summary}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Grades section */}
        {hasGrades && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} style={{ color: "var(--color-green)" }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-green)" }}>
                Grades
              </span>
            </div>
            <div className="space-y-1.5">
              {day.grades.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm px-3 py-1.5 rounded-[var(--radius-sm)]"
                  style={{ background: "var(--color-green-soft)" }}
                >
                  <span className="flex items-center gap-1.5">
                    {g.urgency_score != null && (
                      <span
                        className="inline-flex items-center justify-center shrink-0"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: urgencyBadgeColors[g.urgency_score] ?? "#bdc3c7",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {g.urgency_score}
                      </span>
                    )}
                    New grade: <span className="font-medium">{g.assessment_name}</span>
                    <span className="ml-1" style={{ color: "var(--color-text-3)" }}>
                      ({g.course_code})
                    </span>
                  </span>
                  <span
                    className="font-medium tabular-nums"
                    style={{ fontFamily: "monospace", color: "var(--color-green)" }}
                  >
                    {g.score}/{g.max_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadlines section */}
        {hasDeadlines && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} style={{ color: "var(--color-amber)" }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-amber)" }}>
                Deadlines
              </span>
            </div>
            <div className="space-y-1.5">
              {day.deadlines.map((d) => {
                const colors = urgencyColors[d.urgency] ?? urgencyColors.normal;
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-sm px-3 py-1.5 rounded-[var(--radius-sm)]"
                    style={{ background: colors.bg }}
                  >
                    <span>
                      Due: <span className="font-medium">{d.title}</span>
                      <span className="ml-1" style={{ color: "var(--color-text-3)" }}>
                        ({d.course_code})
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
                        {formatRelative(d.due_date)}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ color: colors.text, fontWeight: 500 }}
                      >
                        {d.urgency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ed Posts section */}
        {hasPosts && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} style={{ color: "var(--color-blue)" }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-blue)" }}>
                Discussion
              </span>
            </div>
            <div className="space-y-1.5">
              {day.posts.map((p) => (
                <div
                  key={p.id}
                  className="text-sm px-3 py-1.5 rounded-[var(--radius-sm)]"
                  style={{ background: "var(--color-blue-soft)" }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium">{p.title}</span>
                    {p.is_endorsed && (
                      <span className="flex items-center gap-0.5 text-xs px-1 py-0.5 rounded" style={{
                        background: "var(--color-green-soft)",
                        color: "var(--color-green)",
                      }}>
                        <Star size={10} /> Endorsed
                      </span>
                    )}
                    {p.is_staff_post && (
                      <span className="flex items-center gap-0.5 text-xs px-1 py-0.5 rounded" style={{
                        background: "var(--color-amber-soft)",
                        color: "var(--color-amber)",
                      }}>
                        <Shield size={10} /> Staff
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs line-clamp-2"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    {p.content_summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RoughCard>
  );
}
