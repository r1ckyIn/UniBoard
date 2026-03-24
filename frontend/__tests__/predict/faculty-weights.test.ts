import { describe, it, expect } from "vitest";
import {
  FACULTY_WEIGHTS,
  getLevelFromCode,
} from "@/lib/predict/faculty-weights";
import type { FacultyScheme } from "@/lib/predict/faculty-weights";

describe("faculty-weights", () => {
  describe("getLevelFromCode", () => {
    it("parses COMP2017 as level 2", () => {
      expect(getLevelFromCode("COMP2017")).toBe(2);
    });

    it("parses COMP3221 as level 3", () => {
      expect(getLevelFromCode("COMP3221")).toBe(3);
    });

    it("parses EDGU1003 as level 1", () => {
      expect(getLevelFromCode("EDGU1003")).toBe(1);
    });

    it("parses MATH2021 as level 2", () => {
      expect(getLevelFromCode("MATH2021")).toBe(2);
    });

    it("parses COMP4XXX as level 4", () => {
      expect(getLevelFromCode("COMP4XXX")).toBe(4);
    });
  });

  describe("standard scheme", () => {
    const weightFn = FACULTY_WEIGHTS.standard;

    it("returns 1 for level 1", () => {
      expect(weightFn(1)).toBe(1);
    });

    it("returns 1 for level 2", () => {
      expect(weightFn(2)).toBe(1);
    });

    it("returns 1 for level 3", () => {
      expect(weightFn(3)).toBe(1);
    });

    it("returns 1 for level 4", () => {
      expect(weightFn(4)).toBe(1);
    });
  });

  describe("engineering scheme", () => {
    const weightFn = FACULTY_WEIGHTS.engineering;

    it("returns 0 for level 1 (excluded)", () => {
      expect(weightFn(1)).toBe(0);
    });

    it("returns 2 for level 2", () => {
      expect(weightFn(2)).toBe(2);
    });

    it("returns 3 for level 3", () => {
      expect(weightFn(3)).toBe(3);
    });

    it("returns 4 for level 4", () => {
      expect(weightFn(4)).toBe(4);
    });

    it("returns 4 for level 5 (4+)", () => {
      expect(weightFn(5)).toBe(4);
    });
  });

  describe("science_honours scheme", () => {
    const weightFn = FACULTY_WEIGHTS.science_honours;

    it("returns 0 for level 1 (excluded)", () => {
      expect(weightFn(1)).toBe(0);
    });

    it("returns 2 for level 2", () => {
      expect(weightFn(2)).toBe(2);
    });

    it("returns 3 for level 3", () => {
      expect(weightFn(3)).toBe(3);
    });

    it("returns 3 for level 4 (3+)", () => {
      expect(weightFn(4)).toBe(3);
    });
  });

  describe("type safety", () => {
    it("exports all three schemes", () => {
      const schemes: FacultyScheme[] = [
        "standard",
        "engineering",
        "science_honours",
      ];
      schemes.forEach((scheme) => {
        expect(typeof FACULTY_WEIGHTS[scheme]).toBe("function");
      });
    });
  });
});
