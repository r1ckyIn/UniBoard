import {
  CheckCircle,
  MessageCircle,
  CalendarClock,
  Star,
  Megaphone,
  GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Filter type union ────────────────────────────────────────────
export type DigestFilterType =
  | "all"
  | "grade"
  | "staff"
  | "deadline"
  | "announcement"
  | "exam";

// ── Highlight configuration ──────────────────────────────────────
interface HighlightMeta {
  icon: LucideIcon;
  color: string;
  label: string;
}

export const HIGHLIGHT_CONFIG: Record<string, HighlightMeta> = {
  new_grade: {
    icon: CheckCircle,
    color: "green",
    label: "New Grade",
  },
  grade_published: {
    icon: CheckCircle,
    color: "green",
    label: "Grade Published",
  },
  grade_alert: {
    icon: CheckCircle,
    color: "green",
    label: "Grade Alert",
  },
  staff_post: {
    icon: MessageCircle,
    color: "blue",
    label: "Staff Post",
  },
  deadline_change: {
    icon: CalendarClock,
    color: "purple",
    label: "Deadline Change",
  },
  deadline_approaching: {
    icon: CalendarClock,
    color: "purple",
    label: "Deadline",
  },
  endorsed_post: {
    icon: Star,
    color: "amber",
    label: "Endorsed Post",
  },
  new_announcement: {
    icon: Megaphone,
    color: "orange",
    label: "Announcement",
  },
  exam_info: {
    icon: GraduationCap,
    color: "red",
    label: "Exam Info",
  },
};

// ── Color classes for highlight type backgrounds ─────────────────
export const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  green: { bg: "bg-[rgba(120,140,93,0.11)]", text: "text-[#788c5d]" },
  blue: { bg: "bg-[rgba(106,155,204,0.11)]", text: "text-[#6a9bcc]" },
  purple: { bg: "bg-[rgba(155,123,184,0.11)]", text: "text-[#9b7bb8]" },
  amber: { bg: "bg-[rgba(176,137,104,0.11)]", text: "text-[#b08968]" },
  orange: { bg: "bg-[rgba(217,119,87,0.11)]", text: "text-[#d97757]" },
  red: { bg: "bg-[rgba(204,68,85,0.11)]", text: "text-[#cc4455]" },
};

// ── Urgency badge styles ─────────────────────────────────────────
export const URGENCY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-[rgba(204,68,85,0.11)]", text: "text-[#cc4455]" },
  important: { bg: "bg-[rgba(217,119,87,0.11)]", text: "text-[#d97757]" },
  informational: { bg: "bg-[rgba(120,140,93,0.11)]", text: "text-[#788c5d]" },
};

// ── Source platform mapping ──────────────────────────────────────
export const SOURCE_MAP: Record<string, "Canvas" | "Ed"> = {
  new_grade: "Canvas",
  grade_published: "Canvas",
  grade_alert: "Canvas",
  staff_post: "Ed",
  deadline_change: "Canvas",
  deadline_approaching: "Canvas",
  endorsed_post: "Ed",
  new_announcement: "Canvas",
  exam_info: "Ed",
};

// ── Urgency priority (lower = higher priority) ───────────────────
export const URGENCY_PRIORITY: Record<string, number> = {
  critical: 0,
  important: 1,
  informational: 2,
};

// ── Filter type to highlight type mapping ────────────────────────
export const FILTER_TYPE_MAP: Record<
  Exclude<DigestFilterType, "all">,
  string[]
> = {
  grade: ["new_grade", "grade_published", "grade_alert"],
  staff: ["staff_post", "endorsed_post"],
  deadline: ["deadline_change", "deadline_approaching"],
  announcement: ["new_announcement"],
  exam: ["exam_info"],
};

// ── Sort courses by highest urgency, then count ──────────────────
interface CourseWithHighlights {
  highlights: { urgency: string }[];
}

export function sortCoursesByUrgency<T extends CourseWithHighlights>(
  courses: T[],
): T[] {
  const priority = new Map<T, number>(
    courses.map((c) => [
      c,
      c.highlights.reduce(
        (min, h) => Math.min(min, URGENCY_PRIORITY[h.urgency] ?? 99),
        Infinity,
      ),
    ]),
  );
  return [...courses].sort((a, b) => {
    const diff = priority.get(a)! - priority.get(b)!;
    return diff !== 0 ? diff : b.highlights.length - a.highlights.length;
  });
}
