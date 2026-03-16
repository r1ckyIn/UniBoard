import { format, formatDistanceToNow, parseISO } from "date-fns";

/**
 * Format an ISO date string as "Mar 20, 2026".
 */
export function formatDeadline(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

/**
 * Format an ISO date string as relative time: "in 2 days" / "3 hours ago".
 */
export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

/**
 * Return a time-of-day greeting based on the current hour.
 */
export function formatGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Return the current day of the week, e.g. "Monday".
 */
export function formatWeekday(): string {
  return format(new Date(), "EEEE");
}
