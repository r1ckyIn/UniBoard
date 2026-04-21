// Server-only QueryClient factory for Next.js RSC prefetch + HydrationBoundary.
//
// MUST mirror frontend/lib/query/client.tsx defaults byte-identical to prevent
// "works in dev, skeleton flash in prod" drift (RESEARCH Pitfall 1).
//
// Isolation contract (T-38-01): every call returns a fresh QueryClient. No module
// singleton, no React.cache(). Simultaneous requests from different users must never
// observe each other's cached data.
//
// Fallback guard: TanStack's isServer export may move in future majors. If so, use
// typeof window === 'undefined'.
import { QueryClient, isServer } from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 min per TRD 13.3
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function getServerQueryClient(): QueryClient {
  if (!isServer) {
    throw new Error(
      "getServerQueryClient() must only be called from a Server Component. " +
        "For client components, use useQueryClient() from @tanstack/react-query.",
    );
  }
  return makeQueryClient();
}
