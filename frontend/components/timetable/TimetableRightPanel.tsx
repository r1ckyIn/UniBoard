"use client";

import { withClientOnly } from "@/components/design-system/ClientOnly";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import TimetableUpcomingDeadlines from "@/components/timetable/TimetableUpcomingDeadlines";
import TimetableCourseLegend from "@/components/timetable/TimetableCourseLegend";

const ClientOnlyMiniCalendar = withClientOnly(
  () => import("@/components/dashboard/MiniCalendar")
);

interface RightPanelDeadline {
  id: string;
  title: string;
  course_id: string;
  due_date: string;
  days_remaining?: number;
}

interface RightPanelCourse {
  id: string;
  code: string;
  name: string;
}

interface TimetableRightPanelProps {
  deadlines: RightPanelDeadline[];
  courses: RightPanelCourse[];
}

/**
 * Right panel container for the timetable page.
 * Renders MiniCalendar, UpcomingDeadlines, and CourseLegend with staggered animations.
 */
export default function TimetableRightPanel({
  deadlines,
  courses,
}: TimetableRightPanelProps) {
  return (
    <>
      <AnimatedEntry delay={5}>
        <ClientOnlyMiniCalendar deadlineDays={[]} onDateClick={() => {}} />
      </AnimatedEntry>
      <AnimatedEntry delay={7}>
        <TimetableUpcomingDeadlines deadlines={deadlines} />
      </AnimatedEntry>
      <AnimatedEntry delay={8}>
        <TimetableCourseLegend courses={courses} />
      </AnimatedEntry>
    </>
  );
}
