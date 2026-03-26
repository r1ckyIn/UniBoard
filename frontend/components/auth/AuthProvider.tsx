"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/auth/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        useAuthStore.getState().setAuth(
          {
            access: session.access_token,
            refresh: session.refresh_token,
          },
          {
            id: session.user.id,
            email: session.user.email ?? "",
            displayName:
              session.user.user_metadata?.display_name ?? "",
          },
        );
      } else {
        useAuthStore.getState().clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
