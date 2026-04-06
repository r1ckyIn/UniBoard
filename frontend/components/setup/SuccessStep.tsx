"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Check, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth/store";
import { useSyncTrigger, syncOptions } from "@/hooks/use-sync";
import { useCourses } from "@/hooks/use-courses";

export default function SuccessStep() {
  const t = useTranslations("setup.success");
  const router = useRouter();
  const locale = useLocale();
  const syncTrigger = useSyncTrigger();

  const [syncStarted, setSyncStarted] = useState(false);

  // Poll sync status every 3 seconds once sync has been triggered
  const { data: syncData } = useQuery({
    ...syncOptions.status(),
    refetchInterval: syncStarted ? 3000 : false,
    enabled: syncStarted,
  });

  // Fetch real courses from backend
  const { data: coursesData } = useCourses();
  const courses = coursesData?.data ?? [];
  const courseNames = courses.map((c) => c.code);

  // Determine sync completion from real status
  const syncStatus = syncData?.data?.last_sync?.status;
  const syncComplete = syncStarted && (syncStatus === "completed" || syncStatus === "failed");

  // Trigger sync on mount
  useEffect(() => {
    syncTrigger
      .mutateAsync({ scope: "all" })
      .then(() => {
        setSyncStarted(true);
      })
      .catch(() => {
        // Still poll even if trigger failed (sync may already be running)
        setSyncStarted(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoToDashboard = () => {
    toast.success(t("toast"));
    useAuthStore.getState().setTokenConfigured(true);
    router.push(`/${locale}`);
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-[rgba(120,140,93,.11)] flex items-center justify-center mx-auto">
        <Check size={30} className="text-[#788c5d]" />
      </div>

      <h2 className="text-[28px] font-serif font-semibold text-text-1 mt-5">
        {t("title")}
      </h2>

      <p className="text-base text-text-2 leading-[1.6] max-w-[400px] mx-auto mt-3">
        {t("description")}
      </p>

      <div className="flex items-center justify-center gap-2 mt-6" aria-live="polite">
        {!syncComplete ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-card-border border-t-[#d97757] rounded-full animate-spin [animation-duration:0.8s]" />
            <span className="italic text-text-3">{t("syncing")}</span>
          </>
        ) : (
          <>
            <Check size={16} className="text-[#788c5d]" />
            <span className="text-[#788c5d] font-semibold">
              {t("synced", { count: courses.length })}
            </span>
          </>
        )}
      </div>

      {syncComplete && courseNames.length > 0 && (
        <p className="mt-3 text-sm text-text-2">{courseNames.join(", ")}</p>
      )}

      {syncComplete && (
        <button
          type="button"
          onClick={handleGoToDashboard}
          className="mt-8 bg-[#d97757] hover:bg-[#c5674a] text-white font-semibold py-3 px-10 rounded-lg transition-all duration-150 ease-in-out hover:-translate-y-px inline-flex items-center gap-2"
        >
          <LayoutDashboard size={16} />
          {t("cta")}
        </button>
      )}
    </div>
  );
}
