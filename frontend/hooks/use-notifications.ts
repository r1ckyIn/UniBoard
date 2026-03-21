import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type NotificationsResponse =
  paths["/notifications"]["get"]["responses"]["200"]["content"]["application/json"];
type AlertsResponse =
  paths["/alerts"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factories ────────────────────────────────────────────────────
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (unreadOnly?: boolean) =>
    [...notificationKeys.all, unreadOnly] as const,
};

export const alertKeys = {
  all: ["alerts"] as const,
  list: () => [...alertKeys.all, "list"] as const,
};

// ── queryOptions factories ──────────────────────────────────────────────────
export const notificationOptions = {
  list: (unreadOnly?: boolean) =>
    queryOptions({
      queryKey: notificationKeys.list(unreadOnly),
      queryFn: () =>
        unreadOnly !== undefined
          ? api
              .get("notifications", {
                searchParams: { unread_only: String(unreadOnly) },
              })
              .json<NotificationsResponse>()
          : api.get("notifications").json<NotificationsResponse>(),
    }),
};

export const alertOptions = {
  list: () =>
    queryOptions({
      queryKey: alertKeys.list(),
      queryFn: () => api.get("alerts").json<AlertsResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useNotifications(unreadOnly?: boolean) {
  return useQuery(notificationOptions.list(unreadOnly));
}

export function useAlerts() {
  return useQuery(alertOptions.list());
}
