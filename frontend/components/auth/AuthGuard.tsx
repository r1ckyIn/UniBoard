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
  // and redirect with the correct tokenConfigured value.
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

  // When user logs in on this page, isAuthenticated flips to true.
  // TanStack Query v5 kills component-level onSuccess callbacks on unmount,
  // so LoginForm's router.replace may never fire. This effect catches that
  // case and redirects to dashboard root — DashboardGuard handles the
  // tokenConfigured check (it awaits restoreTokenConfiguredIfNeeded before
  // setting sessionChecked, so no stale-tokenConfigured race).
  useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    if (isAuthenticated) {
      router.replace(`/${locale}`);
    }
  }, [hydrated, sessionChecked, isAuthenticated, locale, router]);

  if (!hydrated || !sessionChecked) return null;
  if (isAuthenticated) return null;
  return <>{children}</>;
}
