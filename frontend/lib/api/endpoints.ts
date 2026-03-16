/**
 * API endpoint constants.
 * All paths are relative to the /api/v1 prefix configured in the ky client.
 */
export const ENDPOINTS = {
  auth: {
    register: "auth/register",
    login: "auth/login",
    refresh: "auth/refresh",
  },
  users: {
    me: "users/me",
    token: (platform: string) => `users/me/tokens/${platform}`,
  },
  gpa: {
    summary: "gpa/summary",
    course: (id: string) => `gpa/courses/${id}`,
    whatIf: "gpa/what-if",
    target: "gpa/target",
    trend: "gpa/trend",
  },
  deadlines: {
    list: "deadlines",
    conflicts: "deadlines/conflicts",
    detail: (id: string) => `deadlines/${id}`,
  },
  materials: {
    course: (id: string) => `courses/${id}/materials`,
    folder: (cid: string, fid: string) =>
      `courses/${cid}/materials/${fid}`,
    search: "search",
  },
  intelligence: {
    discussions: (id: string) => `courses/${id}/discussions`,
  },
  sync: {
    trigger: "sync/trigger",
    status: "sync/status",
  },
} as const;
