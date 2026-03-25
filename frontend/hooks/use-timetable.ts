import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type SessionsResponse =
  paths["/timetable/sessions"]["get"]["responses"]["200"]["content"]["application/json"];
type WeeksResponse =
  paths["/timetable/weeks"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const timetableKeys = {
  all: ["timetable"] as const,
  sessions: (week?: number) =>
    [...timetableKeys.all, "sessions", week] as const,
  weeks: () => [...timetableKeys.all, "weeks"] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const timetableOptions = {
  sessions: (week?: number) =>
    queryOptions({
      queryKey: timetableKeys.sessions(week),
      queryFn: () =>
        week !== undefined
          ? api
              .get("timetable/sessions", {
                searchParams: { week: String(week) },
              })
              .json<SessionsResponse>()
          : api.get("timetable/sessions").json<SessionsResponse>(),
    }),
  weeks: () =>
    queryOptions({
      queryKey: timetableKeys.weeks(),
      queryFn: () => api.get("timetable/weeks").json<WeeksResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useTimetableSessions(week?: number) {
  return useQuery(timetableOptions.sessions(week));
}

export function useSemesterWeeks() {
  return useQuery(timetableOptions.weeks());
}
