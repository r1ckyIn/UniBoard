import type { components } from "@/lib/api/types.gen";

type Notification = components["schemas"]["Notification"];

export interface ActivityItem {
  id: string;
  type: "grade" | "discussion" | "deadline" | "endorsed";
  text: string;
  strongText: string;
  time: string;
  externalUrl?: string;
}

type TranslateFn = (key: string, values?: Record<string, string>) => string;

/**
 * Map a notification to a display-ready activity item.
 * Shared by DashboardPage and CourseActivityPanel.
 */
export function mapNotificationToActivity(
  n: Notification,
  t: TranslateFn
): ActivityItem {
  let activityType: ActivityItem["type"] = "deadline";
  if (n.type === "grade_published") activityType = "grade";
  else if (n.type === "discussion_reply") activityType = "discussion";
  else if (n.type === "endorsed_answer") activityType = "endorsed";

  const created = new Date(n.created_at);
  const diffMs = Date.now() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const timeStr =
    diffHours < 1
      ? t("time.justNow")
      : diffHours < 24
        ? t("time.hoursAgo", { count: String(diffHours) })
        : t("time.daysAgo", { count: String(Math.floor(diffHours / 24)) });

  return {
    id: n.id,
    type: activityType,
    text: n.body,
    strongText: n.title.split(":")[0].split(" ").slice(-2).join(" "),
    time: timeStr,
    externalUrl: n.action_url,
  };
}
