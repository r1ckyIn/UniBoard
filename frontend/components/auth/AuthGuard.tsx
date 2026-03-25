"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";

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
