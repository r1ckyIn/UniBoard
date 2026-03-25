import type { components } from "@/lib/api/types.gen";

type DigestSummary = components["schemas"]["DigestSummary"];

// Extended types — mock route handler passes through extra fields
// that the OpenAPI schema doesn't define (name, created_at, summary_zh, source_url)
type DigestHighlightExt = components["schemas"]["DigestHighlight"] & {
  created_at?: string;
  summary_zh?: string;
  source_url?: string;
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
            "Lab 4 graded: 92/100 — well above class average (74). Feedback posted on Canvas: excellent pointer handling, minor style deductions on error messages.",
          summary_zh:
            "Lab 4 已评分：92/100 — 远高于班级平均分（74）。Canvas 已发布反馈：指针处理优秀，错误信息格式有少量扣分。",
          urgency: "informational",
          source_url: "https://canvas.sydney.edu.au/courses/48305/grades",
          created_at: "2026-03-21T05:00:00Z",
        },
        {
          type: "staff_post",
          summary:
            'Dr. Smith confirmed: Final exam will NOT cover Chapter 8 (Memory-mapped I/O). Focus revision on Chapters 4-7, especially process scheduling and concurrency primitives.',
          summary_zh:
            "Dr. Smith 确认：期末考试不考第 8 章（内存映射 I/O）。复习重点放在第 4-7 章，特别是进程调度和并发原语。",
          urgency: "important",
          source_thread_id: "t_90001",
          source_url: "https://edstem.org/au/courses/18762/discussion/t_90001",
          created_at: "2026-03-21T02:00:00Z",
        },
        {
          type: "deadline_change",
          summary:
            "Lab 5 deadline extended from Wed 19 Mar to Fri 21 Mar 11:59 PM — staff announcement cited marking backlog. Submit via Canvas Assignments page.",
          summary_zh:
            "Lab 5 截止日期从 3 月 19 日（周三）延期至 3 月 21 日（周五）23:59 — 教师公告提到批改积压。请通过 Canvas 作业页面提交。",
          urgency: "important",
          source_url: "https://canvas.sydney.edu.au/courses/48305/assignments",
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
            'Endorsed answer on "Paxos vs Raft consensus" — detailed comparison with implementation examples, performance benchmarks, and when to use each in production systems.',
          summary_zh:
            `关于「Paxos vs Raft 共识算法」的认可回答 — 包含详细对比、实现示例、性能基准测试，以及在生产系统中何时使用哪种算法。`,
          urgency: "informational",
          source_thread_id: "t_88001",
          source_url: "https://edstem.org/au/courses/19001/discussion/t_88001",
          created_at: "2026-03-21T01:00:00Z",
        },
        {
          type: "new_announcement",
          summary:
            "Project Milestone 2 rubric released — check Canvas Files for detailed grading criteria (architecture 30%, correctness 40%, testing 20%, documentation 10%).",
          summary_zh:
            "Project Milestone 2 评分标准已发布 — 请在 Canvas 文件中查看详细评分标准（架构 30%、正确性 40%、测试 20%、文档 10%）。",
          urgency: "important",
          source_url: "https://canvas.sydney.edu.au/courses/49102/announcements",
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
            'Tutor hint: "Focus on Chapter 5 (MLE) and Chapter 7 (Hypothesis Testing) for the mid-semester. Practice derivation problems from Tutorial 4-6, especially sufficient statistics."',
          summary_zh:
            `辅导员提示：「期中考试重点复习第 5 章（最大似然估计）和第 7 章（假设检验）。练习 Tutorial 4-6 的推导题，特别是充分统计量。」`,
          urgency: "critical",
          source_thread_id: "t_105001",
          source_url: "https://edstem.org/au/courses/18990/discussion/t_105001",
          created_at: "2026-03-21T03:00:00Z",
        },
        {
          type: "new_announcement",
          summary:
            "Essay Draft submission portal now open on Canvas — due Fri 21 Mar 11:59 PM. Must include abstract, methodology outline, and preliminary data analysis (2000 words min).",
          summary_zh:
            "论文草稿提交入口已在 Canvas 开放 — 截止日期 3 月 21 日（周五）23:59。必须包含摘要、方法论大纲和初步数据分析（最少 2000 字）。",
          urgency: "critical",
          source_url: "https://canvas.sydney.edu.au/courses/47801/assignments",
          created_at: "2026-03-20T19:00:00Z",
        },
        {
          type: "staff_post",
          summary:
            'Prof. Chen: "You may use R or Python for the computational section of the essay. Attach your code as an appendix — it will not count toward the word limit."',
          summary_zh:
            `Prof. Chen：「论文的计算部分可以使用 R 或 Python。将代码作为附录提交 — 不计入字数限制。」`,
          urgency: "informational",
          source_thread_id: "t_112001",
          source_url: "https://edstem.org/au/courses/18990/discussion/t_112001",
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
            "Presentation graded: 88/100 (HD) — feedback highlights strong evidence-based arguments and clear delivery. Minor deductions for exceeding time limit by 2 minutes.",
          summary_zh:
            "演讲已评分：88/100（HD）— 反馈指出论据有力且表达清晰。因超时 2 分钟有少量扣分。",
          urgency: "informational",
          source_url: "https://canvas.sydney.edu.au/courses/45210/grades",
          created_at: "2026-03-21T04:00:00Z",
        },
        {
          type: "new_grade",
          summary:
            "Journal Entry 3 graded: 90/100 (HD) — excellent reflection on macronutrient balance and personal dietary analysis. Full marks on critical thinking section.",
          summary_zh:
            "日志 3 已评分：90/100（HD）— 对宏量营养素平衡和个人饮食分析的反思优秀。批判性思维部分满分。",
          urgency: "informational",
          source_url: "https://canvas.sydney.edu.au/courses/45210/grades",
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
            "Dr. Lee: Quiz 4 will cover Sections 14.5-14.8 (surface integrals & Stokes' theorem). Review the worked examples from Lecture 11 — similar problem types will appear.",
          summary_zh:
            `Dr. Lee：Quiz 4 范围为 14.5-14.8 节（曲面积分和 Stokes 定理）。复习第 11 讲的例题 — 考试题型类似。`,
          urgency: "important",
          source_thread_id: "t_71001",
          source_url: "https://edstem.org/au/courses/17550/discussion/t_71001",
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
