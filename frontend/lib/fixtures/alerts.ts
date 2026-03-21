import type { components } from "@/lib/api/types.gen";

type Alert = components["schemas"]["Alert"];

export const alerts: Alert[] = [
  {
    id: "alt_001",
    type: "gpa_risk",
    severity: "critical",
    course_code: "STAT2011",
    message:
      "Current mark 62.0 is 23 points below your target of 85.0. Final exam (70% weight) requires 95+ to reach target.",
    current_mark: 62.0,
    target_mark: 85.0,
    created_at: "2026-03-20T08:00:00Z",
    is_read: false,
  },
  {
    id: "alt_002",
    type: "deadline_risk",
    severity: "critical",
    course_code: "COMP3221",
    message:
      "Project Milestone 2 (25% weight) due in less than 24 hours. Submission closes March 22 at 23:59.",
    deadline: "2026-03-22T23:59:00Z",
    created_at: "2026-03-21T06:00:00Z",
    is_read: false,
  },
  {
    id: "alt_003",
    type: "gpa_risk",
    severity: "warning",
    course_code: "COMP3221",
    message:
      "Current mark 71.0 is 14 points below target. Need 92+ average on remaining assessments (75% weight).",
    current_mark: 71.0,
    target_mark: 85.0,
    created_at: "2026-03-19T08:00:00Z",
    is_read: true,
  },
  {
    id: "alt_004",
    type: "token_expired",
    severity: "warning",
    course_code: "",
    message:
      "Your Ed Discussion API token has expired. Re-configure in Settings to continue syncing discussion data.",
    created_at: "2026-03-20T12:00:00Z",
    is_read: false,
  },
];
