"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { createClient } from "@/lib/supabase/client";
import { restoreTokenConfiguredIfNeeded } from "@/lib/auth/restore-token-status";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();
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

  // Check for existing session on mount. If found, restore token status
  // and redirect. This does NOT react to isAuthenticated changes — LoginForm
  // handles its own navigation after login to avoid a race condition where
  // this effect would redirect with stale tokenConfigured=false before
  // restoreTokenConfiguredIfNeeded() completes.
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        useAuthStore.getState().setAuth(
          { access: session.access_token, refresh: session.refresh_token },
          {
            id: session.user.id,
            email: session.user.email ?? "",
            displayName: session.user.user_metadata?.display_name ?? "",
          },
        );

        await restoreTokenConfiguredIfNeeded();
        const configured = useAuthStore.getState().tokenConfigured;
        router.replace(configured ? `/${locale}` : `/${locale}/setup`);
        return;
      }

      setSessionChecked(true);
    };
    checkSession();
  }, [locale, router]);

  if (!hydrated || !sessionChecked) return null;
  if (isAuthenticated) return null;
  return <>{children}</>;
}
