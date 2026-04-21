// Server-side ky client factory for RSC prefetch.
//
// Key divergence from frontend/lib/api/client.ts:
// 1. JWT is passed in from caller (obtained via supabase.auth.getSession()) —
//    no Zustand access because Zustand lives in browser memory and is
//    undefined in Node (RESEARCH Pitfall 2).
// 2. prefixUrl is ABSOLUTE. Node.js native fetch rejects relative URLs while the
//    browser's ky resolves them implicitly (RESEARCH Pitfall 3). We resolve the
//    origin from trusted sources (env first, then Vercel's injected VERCEL_URL,
//    then headers() as a local-dev fallback) — see resolveOrigin() below.
// 3. No afterResponse 401 handler — server-side prefetch uses silent degrade
//    (D-B4) via per-query .catch(); we do NOT try to clear auth or redirect
//    from the server factory.
//
// BFF forwarding contract: the BFF at frontend/app/api/v1/*/route.ts reads
// ONLY the Authorization header (see frontend/lib/api/proxy.ts:36-38) and
// forwards it verbatim to the Python backend. Injecting Bearer <access_token>
// here satisfies that contract without touching cookies.
//
// Origin resolution (WR-01 defense-in-depth):
// Request-supplied Host / X-Forwarded-Proto headers are normalised by
// Vercel/Railway edges in production, but the factory itself provides no
// allow-list. To avoid trusting deployment-platform behaviour, we prefer a
// configuration-sourced origin and fall back to headers() only when neither
// env var is set (e.g. local dev without APP_ORIGIN). Resolution chain:
//   1. APP_ORIGIN                -> explicit opt-in for any environment.
//   2. https://${VERCEL_URL}     -> injected automatically on Vercel.
//   3. headers() (host + proto)  -> local-dev fallback (pnpm dev on :3001).
import ky from "ky";
import { headers as nextHeaders } from "next/headers";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

async function resolveOrigin(): Promise<string> {
  const configured = process.env.APP_ORIGIN;
  if (configured && configured.length > 0) {
    return stripTrailingSlash(configured);
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.length > 0) {
    // Vercel sets VERCEL_URL as a bare host (no scheme) — always HTTPS in
    // production and preview deployments.
    return stripTrailingSlash(`https://${vercelUrl}`);
  }

  const h = await nextHeaders();
  const host = h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function getServerApiClient(accessToken: string) {
  const origin = await resolveOrigin();

  return ky.create({
    prefixUrl: `${origin}/api/v1`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
}
