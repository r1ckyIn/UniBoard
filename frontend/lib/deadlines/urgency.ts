export type Urgency = "overdue" | "urgent" | "soon" | "later";

/**
 * Classify deadline urgency based on days remaining.
 * overdue: < 0 days, urgent: <= 3 days, soon: <= 7 days, later: > 7 days
 */
export function getUrgency(daysRemaining: number): Urgency {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "soon";
  return "later";
}

/**
 * Color mapping for each urgency level.
 * dot: primary color, bg: subtle background, soft: badge background
 *
 * Note: overdue and urgent share the same red color (#d97757).
 * The visual distinction for overdue comes from the red BORDER on the card (Plan 03).
 */
export const URGENCY_COLORS: Record<
  Urgency,
  { dot: string; bg: string; soft: string }
> = {
  overdue: {
    dot: "#d97757",
    bg: "rgba(217,119,87,.05)",
    soft: "rgba(217,119,87,.11)",
  },
  urgent: {
    dot: "#d97757",
    bg: "rgba(217,119,87,.05)",
    soft: "rgba(217,119,87,.11)",
  },
  soon: {
    dot: "#6a9bcc",
    bg: "rgba(106,155,204,.05)",
    soft: "rgba(106,155,204,.11)",
  },
  later: {
    dot: "#788c5d",
    bg: "rgba(120,140,93,.05)",
    soft: "rgba(120,140,93,.11)",
  },
};
