import type { components } from "@/lib/api/types.gen";

type DigestLatest = components["schemas"]["DigestLatest"];
type DigestSummary = components["schemas"]["DigestSummary"];

// ── Latest daily digest (3 courses, 2 urgent deadlines) ─────────
export const digestLatest: DigestLatest = {
  digest_id: "dig_20260321",
  generated_at: "2026-03-21T07:00:00Z",
  period: "daily",
  courses: [
    {
      code: "COMP2017",
      highlights: [
        {
          type: "grade_published",
          summary:
            "Assignment 2 graded: 78/100. Class average 72.",
          urgency: "informational",
        },
        {
          type: "staff_post",
          summary:
            "Dr. Smith clarified Assignment 3 buffer overflow handling requirements.",
          urgency: "important",
          source_thread_id: "t_90001",
        },
      ],
    },
    {
      code: "STAT2011",
      highlights: [
        {
          type: "grade_alert",
          summary:
            "Current mark dropped to 62.0 after Quiz 2 (55/100). 23 points below target.",
          urgency: "critical",
        },
        {
          type: "staff_post",
          summary:
            "Dr. Lee posted Assignment 2 hints for MLE section.",
          urgency: "important",
          source_thread_id: "t_92002",
        },
      ],
    },
    {
      code: "COMP3221",
      highlights: [
        {
          type: "deadline_approaching",
          summary:
            "Project Milestone 2 due tomorrow (weight: 25%).",
          urgency: "critical",
        },
      ],
    },
  ],
  urgent_deadlines: [
    {
      course_code: "COMP3221",
      title: "Project Milestone 2",
      due_date: "2026-03-22T23:59:00Z",
      hours_remaining: 17,
    },
    {
      course_code: "INFO2222",
      title: "User Testing Report",
      due_date: "2026-03-25T23:59:00Z",
      hours_remaining: 89,
    },
  ],
};

// ── Digest history (5 past digests) ─────────────────────────────
export const digestHistory: DigestSummary[] = [
  {
    digest_id: "dig_20260321",
    generated_at: "2026-03-21T07:00:00Z",
    period: "daily",
    highlight_count: 5,
  },
  {
    digest_id: "dig_20260320",
    generated_at: "2026-03-20T07:00:00Z",
    period: "daily",
    highlight_count: 3,
  },
  {
    digest_id: "dig_20260319",
    generated_at: "2026-03-19T07:00:00Z",
    period: "daily",
    highlight_count: 4,
  },
  {
    digest_id: "dig_20260318",
    generated_at: "2026-03-18T07:00:00Z",
    period: "daily",
    highlight_count: 2,
  },
  {
    digest_id: "dig_20260317",
    generated_at: "2026-03-17T07:00:00Z",
    period: "daily",
    highlight_count: 6,
  },
];
