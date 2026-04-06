"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
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
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/auth`);
    } else if (tokenConfigured) {
      router.replace(`/${locale}`);
    }
  }, [hydrated, isAuthenticated, tokenConfigured, router]);

  // Show nothing until hydration completes (prevents flash)
  if (!hydrated) return null;
  // Not authenticated or already configured: show nothing while redirect happens
  if (!isAuthenticated || tokenConfigured) return null;
  return <>{children}</>;
}
