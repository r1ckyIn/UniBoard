"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/use-notifications";
import { mapNotificationToActivity } from "@/lib/notifications/map-to-activity";
import RecentActivity from "@/components/dashboard/RecentActivity";

interface CourseActivityPanelProps {
  courseId: string;
}

/**
 * Right panel card showing recent activity for a specific course.
 * Reuses dashboard RecentActivity with shared mapping utility, filtered by course ID.
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
      .map((n) => mapNotificationToActivity(n, t));
  }, [data, courseId, t]);

  if (isLoading) {
    return null;
  }

  return <RecentActivity activities={courseActivities} />;
}
