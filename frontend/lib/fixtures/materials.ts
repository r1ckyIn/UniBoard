import type { components } from "@/lib/api/types.gen";

type Material = components["schemas"]["Material"];

export const materialsByCourse: Record<string, Material[]> = {
  crs_comp2017: [
    {
      id: "mat_comp2017_w1",
      title: "Week 1 - Introduction to C",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture Slides: C Basics",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/48201/files/101",
        },
        {
          title: "Lab 1: Hello World",
          type: "assignment",
          url: "https://canvas.sydney.edu.au/courses/48201/assignments/1",
        },
      ],
    },
    {
      id: "mat_comp2017_w2",
      title: "Week 2 - Memory Management",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture Slides: Pointers & Malloc",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/48201/files/102",
        },
        {
          title: "Lab 2: Memory Allocation",
          type: "assignment",
          url: "https://canvas.sydney.edu.au/courses/48201/assignments/2",
        },
        {
          title: "Valgrind Tutorial",
          type: "page",
          url: "https://canvas.sydney.edu.au/courses/48201/pages/valgrind",
        },
      ],
    },
    {
      id: "mat_comp2017_ed1",
      title: "Week 1 - C Programming Fundamentals",
      source: "ed",
      source_type: "lesson",
      slide_count: 42,
      url: "https://edstem.org/au/courses/14501/lessons/1001",
    },
    {
      id: "mat_comp2017_ed2",
      title: "Week 2 - Pointers Deep Dive",
      source: "ed",
      source_type: "lesson",
      slide_count: 38,
      url: "https://edstem.org/au/courses/14501/lessons/1002",
    },
  ],
  crs_comp3221: [
    {
      id: "mat_comp3221_w1",
      title: "Week 1 - Distributed Systems Overview",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Why Distributed?",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/48305/files/201",
        },
      ],
    },
    {
      id: "mat_comp3221_w2",
      title: "Week 2 - Remote Procedure Calls",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: RPC & gRPC",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/48305/files/202",
        },
        {
          title: "Lab 2: Building an RPC Server",
          type: "assignment",
          url: "https://canvas.sydney.edu.au/courses/48305/assignments/3",
        },
      ],
    },
    {
      id: "mat_comp3221_ed1",
      title: "Week 1 - CAP Theorem Explained",
      source: "ed",
      source_type: "lesson",
      slide_count: 35,
      url: "https://edstem.org/au/courses/14602/lessons/2001",
    },
  ],
  crs_stat2011: [
    {
      id: "mat_stat2011_w1",
      title: "Week 1 - Probability Foundations",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Sample Spaces & Events",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/49101/files/301",
        },
        {
          title: "Tutorial 1 Worksheet",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/49101/files/302",
        },
      ],
    },
    {
      id: "mat_stat2011_w2",
      title: "Week 2 - Conditional Probability",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Bayes Theorem",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/49101/files/303",
        },
      ],
    },
    {
      id: "mat_stat2011_ed1",
      title: "Week 1 - Probability Basics",
      source: "ed",
      source_type: "lesson",
      slide_count: 28,
      url: "https://edstem.org/au/courses/14780/lessons/3001",
    },
    {
      id: "mat_stat2011_ed2",
      title: "Week 2 - Bayes Theorem Applications",
      source: "ed",
      source_type: "lesson",
      slide_count: 31,
      url: "https://edstem.org/au/courses/14780/lessons/3002",
    },
  ],
  crs_info2222: [
    {
      id: "mat_info2222_w1",
      title: "Week 1 - Introduction to Usability",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Usability Principles",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/48450/files/401",
        },
        {
          title: "Reading: Nielsen's Heuristics",
          type: "page",
          url: "https://canvas.sydney.edu.au/courses/48450/pages/nielsen",
        },
      ],
    },
    {
      id: "mat_info2222_w2",
      title: "Week 2 - User Research Methods",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Interviews & Surveys",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/48450/files/402",
        },
      ],
    },
    {
      id: "mat_info2222_ed1",
      title: "Week 1 - UX Design Thinking",
      source: "ed",
      source_type: "lesson",
      slide_count: 45,
      url: "https://edstem.org/au/courses/14830/lessons/4001",
    },
  ],
  crs_math1005: [
    {
      id: "mat_math1005_w1",
      title: "Week 1 - Descriptive Statistics",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Measures of Central Tendency",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/47800/files/501",
        },
        {
          title: "R Tutorial: Getting Started",
          type: "page",
          url: "https://canvas.sydney.edu.au/courses/47800/pages/r-intro",
        },
      ],
    },
    {
      id: "mat_math1005_w2",
      title: "Week 2 - Data Visualization",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Histograms & Boxplots",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/47800/files/502",
        },
      ],
    },
    {
      id: "mat_math1005_ed1",
      title: "Week 1 - R Programming Basics",
      source: "ed",
      source_type: "lesson",
      slide_count: 33,
      url: "https://edstem.org/au/courses/14200/lessons/5001",
    },
  ],
};
