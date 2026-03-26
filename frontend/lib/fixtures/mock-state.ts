import { mockUser } from "./users";
import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];

// Mutable mock state that persists across route handler calls
// within the same dev server session
export let currentUser: User = { ...mockUser };

export function updateCurrentUser(updates: Partial<User>): User {
  currentUser = { ...currentUser, ...updates };
  return currentUser;
}

export function resetMockState(): void {
  currentUser = { ...mockUser };
}
