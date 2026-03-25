"use client";

interface TimetableNowLineProps {
  /** Y pixel position computed from timeToY(currentHour) */
  top: number;
}

/**
 * Red horizontal line indicating the current time on the timetable grid.
 * Includes a small circle dot on the left edge.
 */
export default function TimetableNowLine({ top }: TimetableNowLineProps) {
  return (
    <div
      className="absolute left-0 right-0 h-[2px] bg-[#e74c3c] z-[12] pointer-events-none"
      style={{ top }}
    >
      <div className="absolute -left-[5px] -top-[4px] w-[10px] h-[10px] rounded-full bg-[#e74c3c]" />
    </div>
  );
}
