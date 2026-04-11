import { api } from "@/lib/api/client";
import { useAuthStore } from "./store";

async function checkBackendTokenStatus(): Promise<boolean> {
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
  return canvas.status === "active" || ed.status === "active";
}

export async function restoreTokenConfiguredIfNeeded(): Promise<boolean> {
  if (useAuthStore.getState().tokenConfigured) return true;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (await checkBackendTokenStatus()) {
        useAuthStore.getState().setTokenConfigured(true);
        return true;
      }
      return false;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return false;
}
