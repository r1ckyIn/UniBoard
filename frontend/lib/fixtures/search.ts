import type { components } from "@/lib/api/types.gen";

type SearchResult = components["schemas"]["SearchResult"];

export const searchResults: SearchResult[] = [
  {
    type: "material",
    title: "Week 5 - Memory Management and Pointers",
    source: "canvas",
    course_code: "COMP2017",
    snippet:
      "Dynamic memory allocation using malloc/calloc/realloc. Pointer arithmetic and common pitfalls...",
    url: "https://canvas.sydney.edu.au/courses/69855/modules/items/601",
    relevance: 0.95,
  },
  {
    type: "discussion",
    title: "Pointer arithmetic clarification for Lab 5",
    source: "ed",
    course_code: "COMP2017",
    snippet:
      "Staff answer: When you increment a pointer by 1, it moves by sizeof(type) bytes, not 1 byte...",
    url: "https://edstem.org/au/courses/31567/discussion/98001",
    relevance: 0.92,
  },
  {
    type: "material",
    title: "Distributed Consensus Protocols",
    source: "canvas",
    course_code: "COMP3221",
    snippet:
      "Paxos, Raft, and practical consensus in distributed systems. CAP theorem implications...",
    url: "https://canvas.sydney.edu.au/courses/69874/modules/items/710",
    relevance: 0.88,
  },
  {
    type: "discussion",
    title: "Central Limit Theorem application question",
    source: "ed",
    course_code: "STAT2011",
    snippet:
      "The CLT states that sample means approach a normal distribution regardless of population shape...",
    url: "https://edstem.org/au/courses/32627/discussion/98500",
    relevance: 0.85,
  },
  {
    type: "material",
    title: "Macronutrient Analysis and Dietary Assessment",
    source: "canvas",
    course_code: "EDGU1003",
    snippet:
      "Understanding macronutrient balance, daily intake calculations, and evidence-based dietary recommendations...",
    url: "https://canvas.sydney.edu.au/courses/69981/modules/items/820",
    relevance: 0.82,
  },
  {
    type: "discussion",
    title: "Memory leak detection in C programs",
    source: "ed",
    course_code: "COMP2017",
    snippet:
      "Use valgrind to detect memory leaks. Common patterns include forgetting to free in error paths...",
    url: "https://edstem.org/au/courses/31567/discussion/98200",
    relevance: 0.78,
  },
];
