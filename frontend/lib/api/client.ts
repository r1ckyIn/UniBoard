import ky from "ky";
import { useAuthStore } from "@/lib/auth/store";

export const api = ky.create({
  prefixUrl: "/api/v1",
  hooks: {
    beforeRequest: [
      (request) => {
        // Read token inside hook to avoid stale closure (Pitfall 2)
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        // Only clear auth on 401 for GET requests. Mutations (PUT/POST/DELETE)
        // may fail with 401 transiently; clearing auth mid-setup causes redirect loops.
        if (response.status === 401 && request.method === "GET") {
          useAuthStore.getState().clearAuth();
        }
      },
    ],
  },
  retry: {
    limit: 2,
    statusCodes: [408, 429, 500, 502, 503, 504],
    methods: ["get"],
  },
  timeout: 15000,
});
