import ky from "ky";
import type { SuccessResponse } from "./types";
import { getAccessToken } from "../auth/tokens";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Pre-configured ky instance with JWT auth and retry logic.
 * All endpoints are relative to /api/v1, e.g. api.get("gpa/summary").
 */
export const api = ky.create({
  prefixUrl: `${API_BASE}/api/v1`,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 502, 503, 504],
  },
  timeout: 15000,
});

/**
 * Unwrap the SuccessResponse<T> envelope, extracting just .data.
 *
 * Usage:
 *   const summary = await unwrap<GPASummaryResponse>(api.get("gpa/summary"));
 */
export async function unwrap<T>(promise: Promise<Response>): Promise<T> {
  const body: SuccessResponse<T> = await promise.then((r) => r.json());
  return body.data;
}
