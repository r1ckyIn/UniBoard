import { create } from "zustand";

interface NotificationStore {
  /** Current unread notification count. */
  unreadCount: number;
  /** Whether the notification dropdown is open. */
  isDropdownOpen: boolean;
  /** Set the unread count from API response. */
  setUnreadCount: (count: number) => void;
  /** Decrement unread count by 1 (after marking one as read). */
  decrementUnread: () => void;
  /** Toggle the dropdown open/closed. */
  toggleDropdown: () => void;
  /** Close the dropdown. */
  closeDropdown: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  isDropdownOpen: false,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  toggleDropdown: () => set((s) => ({ isDropdownOpen: !s.isDropdownOpen })),
  closeDropdown: () => set({ isDropdownOpen: false }),
}));
