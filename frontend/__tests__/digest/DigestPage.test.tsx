import { describe, it, vi } from "vitest";

// Mock roughjs for jsdom
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      circle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, params?: Record<string, string>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, v);
        }
        return result;
      }
      return key;
    },
}));

describe("DigestPage", () => {
  it.todo("renders loading skeleton when data is fetching");
  it.todo("renders error state with retry button when fetch fails");
  it.todo("renders empty state when digest has no highlights");
  it.todo("renders course sections grouped by course");
  it.todo(
    "sorts courses by highest urgency first, then count descending",
  );
  it.todo("renders urgent banner when critical highlights exist");
  it.todo("hides urgent banner when no critical highlights");
  it.todo("filters highlights by type when filter pill clicked");
  it.todo("hides courses with 0 matching highlights after filter");
  it.todo("renders title row with Radio icon and date badge");
  it.todo("renders 'Generated X ago' text from generated_at");
  it.todo("refresh button invalidates digest query cache");
  it.todo("renders right panel summary card via portal");
  it.todo("renders right panel history card via portal");
});
