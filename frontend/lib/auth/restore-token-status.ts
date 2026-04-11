import { api } from "@/lib/api/client";
import { useAuthStore } from "./store";

export async function restoreTokenConfiguredIfNeeded(): Promise<boolean> {
  if (useAuthStore.getState().tokenConfigured) return true;

  try {
    const resp = await api
      .get("users/me")
      .json<{
        data: {
          tokens: {
            canvas: { status: string };
            ed: { status: string };
          };
        };
      }>();
    const { canvas, ed } = resp.data.tokens;
    if (canvas.status === "active" || ed.status === "active") {
      useAuthStore.getState().setTokenConfigured(true);
      return true;
    }
  } catch {
    // Backend unreachable — caller decides fallback
  }

  return false;
}
