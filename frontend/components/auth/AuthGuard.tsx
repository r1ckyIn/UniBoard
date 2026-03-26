"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { createClient } from "@/lib/supabase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, tokenConfigured } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // zustand persist hydrates async from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. not first render)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    // Check Supabase session on mount (handles page refresh where
    // zustand may have stale data but Supabase cookie has valid session)
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        useAuthStore.getState().setAuth(
          { access: session.access_token, refresh: session.refresh_token },
          {
            id: session.user.id,
            email: session.user.email ?? "",
            displayName: session.user.user_metadata?.display_name ?? "",
          },
        );
      }
    });
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace(tokenConfigured ? "/" : "/setup");
    }
  }, [hydrated, isAuthenticated, tokenConfigured, router]);

  // Show nothing until hydration completes (prevents flash)
  if (!hydrated) return null;
  // Authenticated users see nothing while redirect happens
  if (isAuthenticated) return null;
  return <>{children}</>;
}
