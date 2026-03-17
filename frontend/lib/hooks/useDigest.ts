import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type { DigestResponse, RiskAlertResponse } from "../api/types";

/**
 * Fetch the latest daily digest.
 * staleTime 5 minutes since digest is generated daily.
 */
export function useLatestDigest() {
  return useQuery({
    queryKey: ["digest", "latest"],
    queryFn: () =>
      unwrap<DigestResponse>(api.get(ENDPOINTS.digest.latest)),
    staleTime: 300_000,
  });
}

/**
 * Fetch digest history (last N days).
 * staleTime 5 minutes.
 */
export function useDigestHistory(limit = 7) {
  return useQuery({
    queryKey: ["digest", "history", limit],
    queryFn: () =>
      unwrap<DigestResponse[]>(
        api.get(ENDPOINTS.digest.history, {
          searchParams: { limit: String(limit) },
        })
      ),
    staleTime: 300_000,
  });
}

/**
 * Fetch recent GPA risk alerts.
 * Refetches every 60 seconds.
 */
export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () =>
      unwrap<RiskAlertResponse[]>(api.get(ENDPOINTS.alerts.list)),
    staleTime: 60_000,
  });
}
