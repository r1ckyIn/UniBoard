"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/use-notifications";
import RecentActivity from "@/components/dashboard/RecentActivity";

interface CourseActivityPanelProps {
  courseId: string;
}

/**
 * Right panel card showing recent activity for a specific course.
 * Identical to dashboard RecentActivity but filtered by course ID.
 */
export default function CourseActivityPanel({
  courseId,
}: CourseActivityPanelProps) {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useNotifications();

  const courseActivities = useMemo(() => {
    const notifs = data?.data ?? [];
    const coursePath = `/courses/${courseId}`;

    return notifs
      .filter((n) => n.action_url === coursePath)
      .slice(0, 5)
      .map((n) => {
        let activityType: "grade" | "discussion" | "deadline" | "endorsed" =
          "deadline";
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
              : t("time.daysAgo", {
                  count: String(Math.floor(diffHours / 24)),
                });

        return {
          id: n.id,
          type: activityType,
          text: n.body,
          strongText: n.title.split(":")[0].split(" ").slice(-2).join(" "),
          time: timeStr,
          externalUrl: n.action_url,
        };
      });
  }, [data, courseId, t]);

  if (isLoading) {
    return null;
  }

  return <RecentActivity activities={courseActivities} />;
}
