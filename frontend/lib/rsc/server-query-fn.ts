// Server-side ky client factory for RSC prefetch.
//
// Key divergence from frontend/lib/api/client.ts:
// 1. JWT is passed in from caller (obtained via supabase.auth.getSession()) —
//    no Zustand access because Zustand lives in browser memory and is
//    undefined in Node (RESEARCH Pitfall 2).
// 2. prefixUrl is ABSOLUTE. Node.js native fetch rejects relative URLs while the
//    browser's ky resolves them implicitly (RESEARCH Pitfall 3). We resolve the
//    request origin via Next.js `headers()`.
// 3. No afterResponse 401 handler — server-side prefetch uses silent degrade
//    (D-B4) via per-query .catch(); we do NOT try to clear auth or redirect
//    from the server factory.
//
// BFF forwarding contract: the BFF at frontend/app/api/v1/*/route.ts reads
// ONLY the Authorization header (see frontend/lib/api/proxy.ts:36-38) and
// forwards it verbatim to the Python backend. Injecting Bearer <access_token>
// here satisfies that contract without touching cookies.
import ky from "ky";
import { headers as nextHeaders } from "next/headers";

export async function getServerApiClient(accessToken: string) {
  const h = await nextHeaders();
  const host = h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return ky.create({
    prefixUrl: `${origin}/api/v1`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
}
