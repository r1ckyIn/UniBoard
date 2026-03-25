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
          url: "https://canvas.sydney.edu.au/courses/69855/files/101",
        },
        {
          title: "Lab 1: Hello World",
          type: "assignment",
          url: "https://canvas.sydney.edu.au/courses/69855/assignments/1",
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
          url: "https://canvas.sydney.edu.au/courses/69855/files/102",
        },
        {
          title: "Lab 2: Memory Allocation",
          type: "assignment",
          url: "https://canvas.sydney.edu.au/courses/69855/assignments/2",
        },
        {
          title: "Valgrind Tutorial",
          type: "page",
          url: "https://canvas.sydney.edu.au/courses/69855/pages/valgrind",
        },
      ],
    },
    {
      id: "mat_comp2017_ed1",
      title: "Week 1 - C Programming Fundamentals",
      source: "ed",
      source_type: "lesson",
      slide_count: 42,
      url: "https://edstem.org/au/courses/31567/lessons/1001",
    },
    {
      id: "mat_comp2017_ed2",
      title: "Week 2 - Pointers Deep Dive",
      source: "ed",
      source_type: "lesson",
      slide_count: 38,
      url: "https://edstem.org/au/courses/31567/lessons/1002",
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
          url: "https://canvas.sydney.edu.au/courses/69874/files/201",
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
          url: "https://canvas.sydney.edu.au/courses/69874/files/202",
        },
        {
          title: "Lab 2: Building an RPC Server",
          type: "assignment",
          url: "https://canvas.sydney.edu.au/courses/69874/assignments/3",
        },
      ],
    },
    {
      id: "mat_comp3221_ed1",
      title: "Week 1 - CAP Theorem Explained",
      source: "ed",
      source_type: "lesson",
      slide_count: 35,
      url: "https://edstem.org/au/courses/30772/lessons/2001",
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
          url: "https://canvas.sydney.edu.au/courses/72506/files/301",
        },
        {
          title: "Tutorial 1 Worksheet",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/72506/files/302",
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
          url: "https://canvas.sydney.edu.au/courses/72506/files/303",
        },
      ],
    },
    {
      id: "mat_stat2011_ed1",
      title: "Week 1 - Probability Basics",
      source: "ed",
      source_type: "lesson",
      slide_count: 28,
      url: "https://edstem.org/au/courses/32627/lessons/3001",
    },
    {
      id: "mat_stat2011_ed2",
      title: "Week 2 - Bayes Theorem Applications",
      source: "ed",
      source_type: "lesson",
      slide_count: 31,
      url: "https://edstem.org/au/courses/32627/lessons/3002",
    },
  ],
  crs_edgu1003: [
    {
      id: "mat_edgu1003_w1",
      title: "Week 1 - Introduction to Nutrition Science",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Nutrition Fundamentals",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/69981/files/401",
        },
        {
          title: "Reading: Dietary Guidelines",
          type: "page",
          url: "https://canvas.sydney.edu.au/courses/69981/pages/dietary-guidelines",
        },
      ],
    },
    {
      id: "mat_edgu1003_w2",
      title: "Week 2 - Macronutrients and Energy Balance",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Carbohydrates, Proteins & Fats",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/69981/files/402",
        },
      ],
    },
  ],
  crs_math2021: [
    {
      id: "mat_math2021_w1",
      title: "Week 1 - Vector Functions and Curves",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Parametric Curves & Arc Length",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/70641/files/501",
        },
        {
          title: "Tutorial 1 Worksheet",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/70641/files/502",
        },
      ],
    },
    {
      id: "mat_math2021_w2",
      title: "Week 2 - Line Integrals and Green's Theorem",
      source: "canvas",
      source_type: "module",
      items: [
        {
          title: "Lecture: Line Integrals",
          type: "file",
          url: "https://canvas.sydney.edu.au/courses/70641/files/503",
        },
      ],
    },
    {
      id: "mat_math2021_ed1",
      title: "Week 1 - Vector Calculus Foundations",
      source: "ed",
      source_type: "lesson",
      slide_count: 33,
      url: "https://edstem.org/au/courses/30569/lessons/5001",
    },
  ],
};
