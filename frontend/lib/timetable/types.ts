/**
 * Core timetable data types matching the OpenAPI schema.
 */

export interface TimetableSession {
  id: string;
  /** e.g. "COMP2017" */
  course_code: string;
  /** e.g. "Systems Programming" */
  course_name: string;
  /** e.g. "Lecture" | "TutorialA" | "Tutorial" | "Workshop" | "Seminar" | "Assessment" */
  type: string;
  /** e.g. "01" | "02-P1" | "20" */
  section: string;
  /** 0=Mon, 1=Tue, ..., 6=Sun */
  day: number;
  /** Decimal hour, e.g. 9, 12, 14.5 */
  start_hour: number;
  /** Decimal hour, e.g. 10, 14, 16 */
  end_hour: number;
  /** e.g. "Eastern Ave Auditorium" or "Online" */
  location: string;
  /** Teaching weeks this session runs, e.g. [1,2,3,...] */
  weeks: number[];
}

export interface SemesterWeek {
  /** 1-14 (slider position) */
  position: number;
  /** 0 = break, 1-13 = teaching week */
  teaching_week: number;
  /** e.g. "Week 1" | "Break" | "Week 7" */
  label: string;
  /** ISO date, e.g. "2026-02-23" */
  monday_date: string;
}

export type WeekMode = "week" | "all";
