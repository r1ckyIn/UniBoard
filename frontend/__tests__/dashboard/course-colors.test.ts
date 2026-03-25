import { describe, it, expect } from "vitest";
import { getCourseColor, COURSE_COLORS } from "@/lib/dashboard/course-colors";

describe("course-colors", () => {
  it("returns correct color for known course code", () => {
    expect(getCourseColor("COMP2017")).toEqual({
      base: "#d97757",
      soft: "rgba(217,119,87,.11)",
    });
  });

  it("returns default color for unknown course code", () => {
    expect(getCourseColor("FAKE999")).toEqual({
      base: "#9b9b94",
      soft: "rgba(155,155,148,.11)",
    });
  });

  it("COURSE_COLORS has 5 entries", () => {
    expect(Object.keys(COURSE_COLORS)).toHaveLength(5);
  });
});
