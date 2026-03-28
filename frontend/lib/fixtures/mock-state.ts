import { mockUser } from "./users";
import type { components } from "@/lib/api/types.gen";

// Extended User type to include language_preference (not yet in OpenAPI spec)
type User = components["schemas"]["User"] & { language_preference?: string };

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
