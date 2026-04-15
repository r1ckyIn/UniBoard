"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Check, LayoutDashboard, Loader2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth/store";
import { useSyncTrigger, syncOptions } from "@/hooks/use-sync";
import { useCourses } from "@/hooks/use-courses";

// PlatformHealth.status values returned by /sync/status — see
// frontend/lib/api/types.gen.d.ts
type PlatformHealthStatus = "healthy" | "degraded" | "error";

// Display status the SuccessStep PlatformRow understands.
type RowStatus = "pending" | "in_progress" | "success" | "failed";

type PlatformKey = "canvas" | "ed";

// Map raw backend platform health to the row state machine.
// `degraded` is treated as in-progress because syncing => degraded
// transitionally; only `error` is rendered as a hard failure.
function deriveRowStatus(
  syncStarted: boolean,
  syncTriggered: boolean,
  health: PlatformHealthStatus | undefined,
): RowStatus {
  if (!syncTriggered) return "pending";
  if (health === undefined) return syncStarted ? "in_progress" : "pending";
  if (health === "healthy") return "success";
  if (health === "error") return "failed";
  // "degraded" — usually mid-sync state
  return "in_progress";
}

export default function SuccessStep() {
  const t = useTranslations("setup.success");
  const router = useRouter();
  const locale = useLocale();
  const syncTrigger = useSyncTrigger();

  const [syncStarted, setSyncStarted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Poll sync status every 3 seconds once sync has been triggered.
  const { data: syncData } = useQuery({
    ...syncOptions.status(),
    refetchInterval: syncStarted && !timedOut ? 3000 : false,
    enabled: syncStarted,
  });

  const { data: coursesData } = useCourses();
  const courses = coursesData?.data ?? [];
  const courseNames = courses.map((c) => c.code);

  // Sync status snapshot used by both the legacy banner and the new
  // per-platform rows.
  const syncStatus = syncData?.data;
  const lastSyncStatus = syncStatus?.last_sync?.status;
  const syncComplete =
    syncStarted && (lastSyncStatus === "completed" || lastSyncStatus === "failed");
  const showDashboard = syncComplete || timedOut;

  // Per-platform health from /sync/status (added in plan 33-03).
  const canvasHealth = syncStatus?.platforms?.canvas?.status;
  const edHealth = syncStatus?.platforms?.ed?.status;
  const canvasRowStatus = deriveRowStatus(syncStarted, syncStarted, canvasHealth);
  const edRowStatus = deriveRowStatus(syncStarted, syncStarted, edHealth);

  // Per-platform counters from /sync/status.per_platform_counts (plan 33-03).
  // Always populated to safe zero defaults so the row text is stable.
  const canvasCounts = syncStatus?.per_platform_counts?.canvas ?? null;
  const edCounts = syncStatus?.per_platform_counts?.ed ?? null;

  const failedPlatforms: PlatformKey[] = [];
  if (canvasRowStatus === "failed") failedPlatforms.push("canvas");
  if (edRowStatus === "failed") failedPlatforms.push("ed");
  const hasFailures = failedPlatforms.length > 0;

  // Trigger initial sync on mount.
  useEffect(() => {
    syncTrigger
      .mutateAsync({ scope: "all" })
      .then(() => {
        setSyncStarted(true);
      })
      .catch(() => {
        setSyncStarted(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timeout fallback so users can leave even if sync stalls.
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = () => {
    toast.success(t("toast"));
    useAuthStore.getState().setTokenConfigured(true);
    router.replace(`/${locale}`);
  };

  const handleRetryFailed = () => {
    if (failedPlatforms.length === 0) return;
    syncTrigger.mutate({ scope: "all", platforms: failedPlatforms });
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

      {/* Per-platform rows (plan 33-07). Always rendered after mount so
          users see two distinct progress lines instead of one spinner. */}
      <div
        className="w-full max-w-[420px] mt-6 mx-auto text-left"
        aria-live="polite"
        data-testid="platform-rows"
      >
        <PlatformRow
          platformKey="canvas"
          label={t("canvasLabel")}
          status={canvasRowStatus}
          countsLine={
            canvasCounts !== null && canvasRowStatus === "success"
              ? t("canvasCounts", {
                  courses: String(courses.length),
                  deadlines: String(canvasCounts.deadlines),
                })
              : null
          }
          statusLabel={statusLabelFor(canvasRowStatus, t)}
        />
        <PlatformRow
          platformKey="ed"
          label={t("edLabel")}
          status={edRowStatus}
          countsLine={
            edCounts !== null && edRowStatus === "success"
              ? t("edCounts", { discussions: String(edCounts.discussions) })
              : null
          }
          statusLabel={statusLabelFor(edRowStatus, t)}
        />

        {hasFailures && (
          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={handleRetryFailed}
              data-testid="retry-failed-button"
              className="text-xs font-semibold text-[#d97757] hover:underline"
            >
              {t("retryFailed")}
            </button>
          </div>
        )}
      </div>

      {/* Legacy completion banner kept for users on the old single-spinner UX */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {syncComplete ? (
          <>
            <Check size={16} className="text-[#788c5d]" />
            <span className="text-[#788c5d] font-semibold">
              {t("synced", { count: courses.length })}
            </span>
          </>
        ) : timedOut ? (
          <span className="text-text-3 text-sm">{t("syncSlow")}</span>
        ) : (
          <>
            <div className="w-3.5 h-3.5 border-2 border-card-border border-t-[#d97757] rounded-full animate-spin [animation-duration:0.8s]" />
            <span className="italic text-text-3">{t("syncing")}</span>
          </>
        )}
      </div>

      {syncComplete && courseNames.length > 0 && (
        <p className="mt-3 text-sm text-text-2">{courseNames.join(", ")}</p>
      )}

      {showDashboard && (
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

// ── Platform row subcomponent ─────────────────────────────────────────────

interface PlatformRowProps {
  platformKey: PlatformKey;
  label: string;
  status: RowStatus;
  countsLine: string | null;
  statusLabel: string;
}

function PlatformRow({
  platformKey,
  label,
  status,
  countsLine,
  statusLabel,
}: PlatformRowProps) {
  return (
    <div
      className="flex items-center gap-3 py-2 border-b last:border-b-0 border-card-border/60"
      data-testid={`platform-row-${platformKey}`}
      data-status={status}
    >
      <StatusIcon status={status} />
      <div className="flex-1">
        <div className="text-[0.86rem] font-semibold text-text-1">{label}</div>
        <div className="text-[0.78rem] text-text-3">
          {countsLine ?? statusLabel}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "success") {
    return <Check size={16} className="text-[#788c5d] flex-shrink-0" />;
  }
  if (status === "failed") {
    return <AlertTriangle size={16} className="text-[#d97757] flex-shrink-0" />;
  }
  if (status === "in_progress") {
    return (
      <Loader2
        size={16}
        className="text-[#6a9bcc] animate-spin flex-shrink-0"
      />
    );
  }
  return <Clock size={16} className="text-text-3 flex-shrink-0" />;
}

function statusLabelFor(
  status: RowStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "pending":
      return t("pending");
    case "in_progress":
      return t("inProgress");
    case "failed":
      return t("failed");
    case "success":
      return t("syncing");
  }
}
