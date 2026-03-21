import type { components } from "@/lib/api/types.gen";

type SyncStatusResponse = components["schemas"]["SyncStatusResponse"];

export const syncStatus: SyncStatusResponse = {
  last_sync: {
    sync_id: "sync_a1b2c3",
    status: "completed",
    started_at: "2026-03-20T08:00:00Z",
    completed_at: "2026-03-20T08:02:15Z",
    results: {
      grades: { synced: 14, new: 1, updated: 2 },
      deadlines: { synced: 8, new: 0, updated: 1 },
      discussions: { synced: 45, new: 5, updated: 0 },
    },
  },
  platforms: {
    canvas: {
      status: "healthy",
      last_success: "2026-03-20T08:02:00Z",
    },
    ed: {
      status: "healthy",
      last_success: "2026-03-20T08:02:15Z",
    },
  },
};
