import type { components } from "@/lib/api/types.gen";

type DigestSummary = components["schemas"]["DigestSummary"];

// Extended types — mock route handler passes through extra fields
// that the OpenAPI schema doesn't define (name, created_at)
type DigestHighlightExt = components["schemas"]["DigestHighlight"] & {
  created_at?: string;
};

type DigestCourseEntryExt = Omit<
  components["schemas"]["DigestCourseEntry"],
  "highlights"
> & {
  name: string;
  highlights: DigestHighlightExt[];
};

type DigestLatestExt = Omit<
  components["schemas"]["DigestLatest"],
  "courses"
> & {
  courses: DigestCourseEntryExt[];
};

// ── Latest daily digest (5 courses, all 6 highlight types) ──────
export const digestLatest: DigestLatestExt = {
  digest_id: "dig_20260321",
  generated_at: "2026-03-21T07:00:00Z",
  period: "daily",
  courses: [
    {
      code: "COMP2017",
      name: "Systems Programming",
      highlights: [
        {
          type: "new_grade",
          summary:
            "Lab 4 graded: 92/100 — well above class average (74)",
          urgency: "informational",
          created_at: "2026-03-21T05:00:00Z",
        },
        {
          type: "staff_post",
          summary:
            "Dr. Smith confirmed: Final exam will NOT cover Chapter 8 (Memory-mapped I/O)",
          urgency: "important",
          source_thread_id: "t_90001",
          created_at: "2026-03-21T02:00:00Z",
        },
        {
          type: "deadline_change",
          summary:
            "Lab 5 deadline extended from Wed 19 Mar to Fri 21 Mar (staff announcement)",
          urgency: "important",
          created_at: "2026-03-20T23:00:00Z",
        },
      ],
    },
    {
      code: "COMP3221",
      name: "Distributed Systems",
      highlights: [
        {
          type: "endorsed_post",
          summary:
            'Endorsed answer on "Paxos vs Raft consensus" — detailed comparison with implementation examples',
          urgency: "informational",
          source_thread_id: "t_88001",
          created_at: "2026-03-21T01:00:00Z",
        },
        {
          type: "new_announcement",
          summary:
            "Project Milestone 2 rubric released — check Canvas Files for grading criteria",
          urgency: "important",
          created_at: "2026-03-20T21:00:00Z",
        },
      ],
    },
    {
      code: "STAT2011",
      name: "Probability & Estimation",
      highlights: [
        {
          type: "exam_info",
          summary:
            'Tutor hint: "Focus on Chapter 5 (MLE) and Chapter 7 (Hypothesis Testing) for the mid-semester"',
          urgency: "critical",
          source_thread_id: "t_105001",
          created_at: "2026-03-21T03:00:00Z",
        },
        {
          type: "new_announcement",
          summary:
            "Essay Draft submission portal now open on Canvas — due Fri 21 Mar 11:59 PM",
          urgency: "critical",
          created_at: "2026-03-20T19:00:00Z",
        },
        {
          type: "staff_post",
          summary:
            'Prof. Chen: "You may use R or Python for the computational section of the essay"',
          urgency: "informational",
          source_thread_id: "t_112001",
          created_at: "2026-03-20T17:00:00Z",
        },
      ],
    },
    {
      code: "EDGU1003",
      name: "Diet & Nutrition",
      highlights: [
        {
          type: "new_grade",
          summary:
            "Presentation graded: 88/100 (HD) — feedback available on Canvas",
          urgency: "informational",
          created_at: "2026-03-21T04:00:00Z",
        },
        {
          type: "new_grade",
          summary: "Journal Entry 3 graded: 90/100 (HD)",
          urgency: "informational",
          created_at: "2026-03-21T04:00:00Z",
        },
      ],
    },
    {
      code: "MATH2021",
      name: "Vector Calculus",
      highlights: [
        {
          type: "staff_post",
          summary:
            "Dr. Lee: Quiz 4 will cover Sections 14.5-14.8 (surface integrals & Stokes' theorem)",
          urgency: "important",
          source_thread_id: "t_71001",
          created_at: "2026-03-21T00:00:00Z",
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
      course_code: "STAT2011",
      title: "Essay Draft",
      due_date: "2026-03-21T23:59:00Z",
      hours_remaining: 5,
    },
  ],
};

// ── Digest history (5 past digests) ─────────────────────────────
export const digestHistory: DigestSummary[] = [
  {
    digest_id: "dig_20260321",
    generated_at: "2026-03-21T07:00:00Z",
    period: "daily",
    highlight_count: 11,
  },
  {
    digest_id: "dig_20260320",
    generated_at: "2026-03-20T07:00:00Z",
    period: "daily",
    highlight_count: 7,
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
    highlight_count: 9,
  },
  {
    digest_id: "dig_20260317",
    generated_at: "2026-03-17T07:00:00Z",
    period: "daily",
    highlight_count: 6,
  },
];
