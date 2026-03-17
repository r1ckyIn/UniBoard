import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type {
  NotificationResponse,
  UnreadCountResponse,
} from "../api/types";
import { useNotificationStore } from "../stores/notifications";

/**
 * Fetch paginated notification list.
 * Refetches every 60 seconds to pick up new notifications.
 */
export function useNotifications(limit = 50) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: () =>
      unwrap<NotificationResponse[]>(
        api.get(ENDPOINTS.notifications.list, {
          searchParams: { limit: String(limit) },
        })
      ),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch unread notification count and sync to Zustand store.
 * Polls every 30 seconds.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const data = await unwrap<UnreadCountResponse>(
        api.get(ENDPOINTS.notifications.unreadCount)
      );
      useNotificationStore.getState().setUnreadCount(data.count);
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/**
 * Mark a notification as read. Invalidates notification queries
 * and decrements the Zustand unread counter.
 */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      unwrap<NotificationResponse>(
        api.patch(ENDPOINTS.notifications.markRead(notificationId))
      ),
    onSuccess: () => {
      useNotificationStore.getState().decrementUnread();
      void queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });
}
