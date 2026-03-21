import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];

export const mockUser: User = {
  id: "usr_001",
  email: "student@sydney.edu.au",
  display_name: "Alex Chen",
  gpa_target: 85.0,
  gpa_scale: "wam",
  tokens: {
    canvas: {
      status: "active",
      last_verified_at: "2026-03-01T10:00:00Z",
    },
    ed: {
      status: "active",
      last_verified_at: "2026-03-01T10:00:00Z",
    },
  },
  created_at: "2026-02-01T00:00:00Z",
};

export const mockTokens = {
  access: "mock-jwt-access-token-xxx",
  refresh: "mock-jwt-refresh-token-xxx",
};
