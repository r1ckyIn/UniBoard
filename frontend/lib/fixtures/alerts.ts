import type { components } from "@/lib/api/types.gen";

type Alert = components["schemas"]["Alert"];

export const alerts: Alert[] = [
  {
    id: "alt_001",
    type: "gpa_risk",
    severity: "critical",
    course_code: "STAT2011",
    message:
      "Current mark 0.0 is 85 points below your target of 85.0. Final exam (60% weight) requires exceptional performance to reach target.",
    current_mark: 0.0,
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
      "Current mark 65.6 is 19.4 points below target. Need 87+ average on remaining assessments (90% weight).",
    current_mark: 65.6,
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
