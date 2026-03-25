import { describe, it, expect } from "vitest";
import {
  timeToY,
  formatTime,
  GRID_HEIGHT,
  NORMAL_ZONE_END_PX,
} from "@/lib/timetable/time-utils";

describe("timeToY", () => {
  it("returns 0 at start of normal zone (hour 8)", () => {
    expect(timeToY(8)).toBe(0);
  });

  it("returns 240 at hour 12 (4 hours * 60px)", () => {
    expect(timeToY(12)).toBe(240);
  });

  it("returns 600 at hour 18 (10 hours * 60px)", () => {
    expect(timeToY(18)).toBe(600);
  });

  it("returns 660 at hour 19 (normal zone end)", () => {
    expect(timeToY(19)).toBe(660);
  });

  it("returns 688 at hour 20 (660 + 1*28)", () => {
    expect(timeToY(20)).toBe(688);
  });

  it("returns 772 at hour 23 (660 + 4*28)", () => {
    expect(timeToY(23)).toBe(772);
  });

  it("handles half-hour values in normal zone", () => {
    // 9.5 -> (9.5 - 8) * 60 = 90
    expect(timeToY(9.5)).toBe(90);
  });

  it("handles half-hour values in compressed zone", () => {
    // 19.5 -> 660 + 0.5 * 28 = 674
    expect(timeToY(19.5)).toBe(674);
  });
});

describe("formatTime", () => {
  it("formats integer hour with leading zero", () => {
    expect(formatTime(9)).toBe("09:00");
  });

  it("formats integer hour without leading zero", () => {
    expect(formatTime(14)).toBe("14:00");
  });

  it("formats half-hour value", () => {
    expect(formatTime(14.5)).toBe("14:30");
  });

  it("formats early morning hour", () => {
    expect(formatTime(8)).toBe("08:00");
  });
});

describe("constants", () => {
  it("GRID_HEIGHT equals 772", () => {
    expect(GRID_HEIGHT).toBe(772);
  });

  it("NORMAL_ZONE_END_PX equals 660", () => {
    expect(NORMAL_ZONE_END_PX).toBe(660);
  });
});
