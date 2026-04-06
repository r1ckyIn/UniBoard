"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { createClient } from "@/lib/supabase/client";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, tokenConfigured } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // Check Supabase session on mount (handles page refresh)
  useEffect(() => {
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
      setSessionChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/auth`);
    } else if (!tokenConfigured) {
      router.replace(`/${locale}/setup`);
    }
  }, [hydrated, sessionChecked, isAuthenticated, tokenConfigured, locale, router]);

  if (!hydrated || !sessionChecked) return null;
  if (!isAuthenticated || !tokenConfigured) return null;
  return <>{children}</>;
}
