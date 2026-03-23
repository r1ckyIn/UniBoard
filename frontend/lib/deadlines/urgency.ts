export type Urgency = "urgent" | "soon" | "later";

/**
 * Classify deadline urgency based on days remaining.
 * urgent: <= 3 days, soon: <= 7 days, later: > 7 days
 */
export function getUrgency(daysRemaining: number): Urgency {
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "soon";
  return "later";
}

/**
 * Color mapping for each urgency level.
 * dot: primary color, bg: subtle background, soft: badge background
 */
export const URGENCY_COLORS: Record<
  Urgency,
  { dot: string; bg: string; soft: string }
> = {
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

/**
 * Human-readable urgency label.
 */
export function urgencyLabel(days: number): string {
  if (days <= 0) return "Past due";
  if (days === 1) return "1 day";
  return `${days} days`;
}
