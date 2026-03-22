"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth/store";
import { useSyncTrigger } from "@/hooks/use-sync";

const MOCK_COURSES = [
  "COMP2017",
  "COMP3221",
  "STAT2011",
  "INFO2222",
  "MATH1005",
];

export default function SuccessStep() {
  const t = useTranslations("setup.success");
  const router = useRouter();
  const syncTrigger = useSyncTrigger();

  const [syncStatus, setSyncStatus] = useState<"syncing" | "complete">("syncing");
  const [courseNames, setCourseNames] = useState<string[]>([]);

  useEffect(() => {
    syncTrigger.mutateAsync({
      scope: "all",
    }).catch(() => {});

    const timer = setTimeout(() => {
      setCourseNames(MOCK_COURSES);
      setSyncStatus("complete");
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoToDashboard = () => {
    toast.success(t("toast"));
    useAuthStore.getState().setTokenConfigured(true);
    router.push("/");
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
        {syncStatus === "syncing" ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-card-border border-t-[#d97757] rounded-full animate-spin [animation-duration:0.8s]" />
            <span className="italic text-text-3">{t("syncing")}</span>
          </>
        ) : (
          <>
            <Check size={16} className="text-[#788c5d]" />
            <span className="text-[#788c5d] font-semibold">
              {t("synced", { count: courseNames.length })}
            </span>
          </>
        )}
      </div>

      {syncStatus === "complete" && courseNames.length > 0 && (
        <p className="mt-3 text-sm text-text-2">{courseNames.join(", ")}</p>
      )}

      {syncStatus === "complete" && (
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
