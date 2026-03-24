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

describe("HighlightItem", () => {
  it.todo("renders icon with correct background color class for type");
  it.todo("renders type label text");
  it.todo("renders summary text");
  it.todo("renders urgency badge with correct style");
  it.todo("renders source badge (Canvas or Ed)");
  it.todo("renders relative time from created_at");
  it.todo("renders 'View thread' link when source_thread_id present");
  it.todo("does not render thread link when source_thread_id absent");
});
