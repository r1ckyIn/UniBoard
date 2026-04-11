"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
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

        if (!useAuthStore.getState().tokenConfigured) {
          try {
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
            if (canvas.status === "active" || ed.status === "active") {
              useAuthStore.getState().setTokenConfigured(true);
            }
          } catch {
            // Backend unreachable — fall through to setup redirect
          }
        }
      }

      setSessionChecked(true);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    if (isAuthenticated) {
      router.replace(tokenConfigured ? `/${locale}` : `/${locale}/setup`);
    }
  }, [hydrated, sessionChecked, isAuthenticated, tokenConfigured, locale, router]);

  if (!hydrated || !sessionChecked) return null;
  if (isAuthenticated) return null;
  return <>{children}</>;
}
