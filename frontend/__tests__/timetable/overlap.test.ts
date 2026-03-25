import { describe, it, expect } from "vitest";
import { assignCols, type OverlappableEvent } from "@/lib/timetable/overlap";

function makeEvent(
  start_hour: number,
  end_hour: number,
): OverlappableEvent {
  return { start_hour, end_hour };
}

describe("assignCols", () => {
  it("assigns col=0, cc=1 to non-overlapping events", () => {
    const events = [makeEvent(9, 10), makeEvent(11, 12), makeEvent(14, 15)];
    const result = assignCols(events);

    result.forEach((ev) => {
      expect(ev._col).toBe(0);
      expect(ev._cc).toBe(1);
    });
  });

  it("assigns col 0 and 1 with cc=2 for 2 overlapping events", () => {
    const events = [makeEvent(9, 11), makeEvent(10, 12)];
    const result = assignCols(events);

    expect(result[0]._col).toBe(0);
    expect(result[0]._cc).toBe(2);
    expect(result[1]._col).toBe(1);
    expect(result[1]._cc).toBe(2);
  });

  it("groups transitively overlapping events (A:9-11, B:10-12, C:11-13)", () => {
    const events = [makeEvent(9, 11), makeEvent(10, 12), makeEvent(11, 13)];
    const result = assignCols(events);

    // All three in one group (transitive: A overlaps B, B overlaps C)
    // C starts at 11 >= A's end 11, so C reuses col 0 -> only 2 columns needed
    result.forEach((ev) => {
      expect(ev._cc).toBe(2);
    });
    expect(result[0]._col).toBe(0);
    expect(result[1]._col).toBe(1);
    expect(result[2]._col).toBe(0); // reuses col 0
  });

  it("processes mixed groups independently", () => {
    // Group 1: 9-11 and 10-12 overlap
    // Group 2: 14-15 alone
    const events = [
      makeEvent(9, 11),
      makeEvent(10, 12),
      makeEvent(14, 15),
    ];
    const result = assignCols(events);

    // Group 1
    expect(result[0]._col).toBe(0);
    expect(result[0]._cc).toBe(2);
    expect(result[1]._col).toBe(1);
    expect(result[1]._cc).toBe(2);

    // Group 2
    expect(result[2]._col).toBe(0);
    expect(result[2]._cc).toBe(1);
  });

  it("handles empty array", () => {
    const result = assignCols([]);
    expect(result).toEqual([]);
  });

  it("handles single event", () => {
    const events = [makeEvent(9, 10)];
    const result = assignCols(events);
    expect(result[0]._col).toBe(0);
    expect(result[0]._cc).toBe(1);
  });

  it("reuses columns when event fits after a previous one ends", () => {
    // A: 9-10, B: 9-11, C: 10-11 (C can reuse A's column)
    const events = [makeEvent(9, 10), makeEvent(9, 11), makeEvent(10, 11)];
    const result = assignCols(events);

    // All three in one group (A overlaps B, B overlaps C transitively)
    expect(result[0]._col).toBe(0);
    expect(result[1]._col).toBe(1);
    // C starts at 10 which >= A's end of 10, so C can reuse col 0
    expect(result[2]._col).toBe(0);
    expect(result[0]._cc).toBe(2);
    expect(result[1]._cc).toBe(2);
    expect(result[2]._cc).toBe(2);
  });
});
