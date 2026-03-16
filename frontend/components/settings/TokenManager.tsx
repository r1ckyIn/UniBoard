"use client";

import { useState, useCallback } from "react";
import {
  GraduationCap,
  MessageSquare,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  AlertCircle,
  MinusCircle,
} from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useCurrentUser, useSetToken } from "@/lib/hooks/useUser";
import { useSyncStatus, useTriggerSync } from "@/lib/hooks/useSync";
import { formatRelative } from "@/lib/utils/dates";
import type { TokenStatus } from "@/lib/api/types";

/** Status badge with appropriate color */
function StatusBadge({ status }: { status: TokenStatus["status"] }) {
  const config = {
    active: { bg: "var(--color-green-soft)", color: "var(--color-green)", icon: Check, label: "Active" },
    invalid: { bg: "var(--color-orange-soft)", color: "var(--color-orange)", icon: AlertCircle, label: "Invalid" },
    not_configured: { bg: "var(--color-card-border)", color: "var(--color-text-3)", icon: MinusCircle, label: "Not Configured" },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
      style={{ background: config.bg, color: config.color }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

/** Single platform token section */
function PlatformSection({
  platform,
  label,
  icon: Icon,
  tokenStatus,
  lastSynced,
}: {
  platform: string;
  label: string;
  icon: typeof GraduationCap;
  tokenStatus: TokenStatus | undefined;
  lastSynced: string | null;
}) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [message, setMessage] = useState("");
  const setTokenMutation = useSetToken(platform);

  const handleUpdate = useCallback(async () => {
    if (!token.trim()) return;
    try {
      const result = await setTokenMutation.mutateAsync({ token: token.trim() });
      setMessage(`Updated! ${result.courses_found} courses found.`);
      setToken("");
      setTimeout(() => setMessage(""), 5000);
    } catch {
      setMessage("Failed to update token. Please check and try again.");
    }
  }, [token, setTokenMutation]);

  const status = tokenStatus?.status ?? "not_configured";

  return (
    <div
      className="p-4 rounded-[var(--radius-sm)]"
      style={{ border: "1px solid var(--color-divider)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={20} style={{ color: "var(--color-orange)" }} />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {lastSynced && (
        <p className="text-xs mb-3" style={{ color: "var(--color-text-3)" }}>
          Last synced: {formatRelative(lastSynced)}
        </p>
      )}

      {/* Token input */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <input
            type={showToken ? "text" : "password"}
            placeholder={`Paste your ${label} token...`}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full text-sm px-3 py-2 pr-8 rounded-[var(--radius-sm)]"
            style={{
              fontFamily: "monospace",
              border: "1px solid var(--color-card-border)",
              background: "var(--color-cream)",
              color: "var(--color-text-1)",
            }}
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
            style={{ color: "var(--color-text-3)" }}
          >
            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={handleUpdate}
          disabled={setTokenMutation.isPending || !token.trim()}
          className="px-3 py-2 text-sm rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50"
          style={{
            background: "var(--color-orange)",
            color: "white",
          }}
        >
          {setTokenMutation.isPending ? "Updating..." : "Update Token"}
        </button>
      </div>

      {message && (
        <p
          className="text-xs"
          style={{
            color: message.includes("Failed") ? "var(--color-orange)" : "var(--color-green)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Token management component for Canvas and Ed API tokens.
 * Shows status badges, update forms, and sync controls.
 */
export default function TokenManager() {
  const { data: user } = useCurrentUser();
  const { data: syncStatus } = useSyncStatus();
  const triggerSync = useTriggerSync();

  const canvasSyncSource = syncStatus?.sources.find(
    (s) => s.platform === "canvas"
  );
  const edSyncSource = syncStatus?.sources.find(
    (s) => s.platform === "ed"
  );

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <h2
        className="text-xl mb-1"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        API Tokens
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-3)" }}>
        Connect your university platforms to sync course data
      </p>

      <div className="space-y-3 mb-4">
        <PlatformSection
          platform="canvas"
          label="Canvas"
          icon={GraduationCap}
          tokenStatus={user?.tokens?.canvas}
          lastSynced={canvasSyncSource?.last_synced_at ?? null}
        />
        <PlatformSection
          platform="ed"
          label="Ed"
          icon={MessageSquare}
          tokenStatus={user?.tokens?.ed}
          lastSynced={edSyncSource?.last_synced_at ?? null}
        />
      </div>

      {/* Sync button */}
      <button
        onClick={() => triggerSync.mutate()}
        disabled={triggerSync.isPending || syncStatus?.is_syncing}
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 w-full justify-center"
        style={{
          border: "1px solid var(--color-card-border)",
          background: "var(--color-cream)",
          color: "var(--color-text-2)",
        }}
      >
        <RefreshCw
          size={14}
          className={triggerSync.isPending || syncStatus?.is_syncing ? "animate-spin" : ""}
        />
        {syncStatus?.is_syncing ? "Syncing..." : "Sync Now"}
      </button>
    </RoughCard>
  );
}
