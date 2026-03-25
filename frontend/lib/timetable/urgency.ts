/**
 * Shared urgency classification and styling for timetable deadlines.
 */

export type UrgencyLevel = "urgent" | "warning" | "normal" | "later";

export const MAX_UPCOMING_DEADLINES = 4;

/** Badge color palette for each urgency level */
export const URGENCY_BADGE: Record<UrgencyLevel, { bg: string; text: string }> = {
  urgent: { bg: "rgba(217,119,87,.11)", text: "#d97757" },
  warning: { bg: "rgba(176,137,104,.11)", text: "#b08968" },
  normal: { bg: "rgba(106,155,204,.11)", text: "#6a9bcc" },
  later: { bg: "rgba(120,140,93,.11)", text: "#788c5d" },
};

/** Classify urgency from days remaining */
export function classifyUrgency(days: number): UrgencyLevel {
  if (days <= 2) return "urgent";
  if (days <= 4) return "warning";
  if (days <= 7) return "normal";
  return "later";
}

/** Background tint for urgent/warning items */
export function getItemBg(urgency: UrgencyLevel): string | undefined {
  if (urgency === "urgent") return "rgba(217,119,87,0.04)";
  if (urgency === "warning") return "rgba(176,137,104,0.04)";
  return undefined;
}
