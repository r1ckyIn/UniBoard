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

describe("CourseSectionCard", () => {
  it.todo("renders course code and name in header");
  it.todo("renders colored dot matching course color");
  it.todo("renders left stripe with course color");
  it.todo("renders highlight count badge");
  it.todo("renders all highlight items");
});
