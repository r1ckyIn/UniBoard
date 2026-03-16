import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type { DeadlineResponse, ConflictDay } from "../api/types";

interface DeadlineParams {
  course_code?: string;
  urgency?: string;
  from_date?: string;
  to_date?: string;
  include_past?: boolean;
}

/**
 * Fetch filtered deadline list.
 * staleTime matches the 1-hour deadline sync frequency.
 */
export function useDeadlines(params?: DeadlineParams) {
  return useQuery({
    queryKey: ["deadlines", params],
    queryFn: () => {
      const searchParams: Record<string, string> = {};
      if (params?.course_code) searchParams.course_code = params.course_code;
      if (params?.urgency) searchParams.urgency = params.urgency;
      if (params?.from_date) searchParams.from_date = params.from_date;
      if (params?.to_date) searchParams.to_date = params.to_date;
      if (params?.include_past !== undefined)
        searchParams.include_past = String(params.include_past);

      return unwrap<DeadlineResponse[]>(
        api.get(ENDPOINTS.deadlines.list, { searchParams })
      );
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch days with multiple overlapping deadlines.
 */
export function useDeadlineConflicts() {
  return useQuery({
    queryKey: ["deadlines", "conflicts"],
    queryFn: () =>
      unwrap<ConflictDay[]>(api.get(ENDPOINTS.deadlines.conflicts)),
    staleTime: 60 * 60 * 1000,
  });
}
