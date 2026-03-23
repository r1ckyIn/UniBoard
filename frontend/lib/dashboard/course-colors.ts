export const COURSE_COLORS: Record<string, { base: string; soft: string }> = {
  COMP2017: { base: "#d97757", soft: "rgba(217,119,87,.11)" },
  COMP3221: { base: "#6a9bcc", soft: "rgba(106,155,204,.11)" },
  STAT2011: { base: "#b08968", soft: "rgba(176,137,104,.11)" },
  INFO2222: { base: "#788c5d", soft: "rgba(120,140,93,.11)" },
  MATH1005: { base: "#9b7bb8", soft: "rgba(155,123,184,.11)" },
};

const DEFAULT_COLOR = { base: "#9b9b94", soft: "rgba(155,155,148,.11)" };

export function getCourseColor(courseCode: string): { base: string; soft: string } {
  return COURSE_COLORS[courseCode] ?? DEFAULT_COLOR;
}
