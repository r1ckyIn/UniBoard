"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useConfigureToken } from "@/hooks/use-user";
import { useDateFnsLocale } from "@/lib/utils/date-fns-locale";
import { useSyncTrigger } from "@/hooks/use-sync";
import { validateCanvasToken, validateEdToken } from "@/lib/validations/token";
import { PLATFORM_CONFIG } from "@/components/setup/platform-config";
import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];
type TokenStatusType = "active" | "invalid" | "not_configured";

const PLATFORMS = ["canvas", "ed"] as const;

interface TokensSectionProps {
  user: User;
}

/**
 * Token management section: shows Canvas/Ed platform rows
 * with status badges, visibility toggle, update button, and sync trigger.
 */
export default function TokensSection({ user }: TokensSectionProps) {
  const t = useTranslations("settings");
  const configureToken = useConfigureToken();
  const syncTrigger = useSyncTrigger();
  const dateFnsLocale = useDateFnsLocale();

  // Per-platform local state
  const [canvasToken, setCanvasToken] = useState("");
  const [edToken, setEdToken] = useState("");
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [edVisible, setEdVisible] = useState(false);
  const [canvasError, setCanvasError] = useState("");
  const [edError, setEdError] = useState("");

  const tokenState = {
    canvas: { value: canvasToken, setValue: setCanvasToken, visible: canvasVisible, setVisible: setCanvasVisible, error: canvasError, setError: setCanvasError },
    ed: { value: edToken, setValue: setEdToken, visible: edVisible, setVisible: setEdVisible, error: edError, setError: setEdError },
  };

  const validators = {
    canvas: validateCanvasToken,
    ed: validateEdToken,
  };

  function handleUpdate(platform: "canvas" | "ed") {
    const state = tokenState[platform];
    const isValid = validators[platform](state.value);

    if (!isValid) {
      state.setError(t("tokens.statusInvalid"));
      return;
    }

    state.setError("");
    configureToken.mutate({
      platform,
      body: { token: state.value },
    });
  }

  function handleSync() {
    syncTrigger.mutate({ scope: "all" });
  }

  function getStatusBadge(status: TokenStatusType) {
    switch (status) {
      case "active":
        return {
          text: t("tokens.statusActive"),
          icon: <CheckCircle size={11} />,
          className: "bg-[rgba(120,140,93,.11)] text-[#788c5d]",
        };
      case "invalid":
        return {
          text: t("tokens.statusInvalid"),
          icon: <AlertCircle size={11} />,
          className: "bg-[rgba(217,119,87,.11)] text-[#d97757]",
        };
      case "not_configured":
        return {
          text: t("tokens.statusNotConfigured"),
          icon: null,
          className: "bg-[#efede6] text-[#9b9b94]",
        };
    }
  }

  return (
    <div>
      {PLATFORMS.map((platform) => {
        const config = PLATFORM_CONFIG[platform];
        const Icon = config.icon;
        const tokenInfo = user.tokens[platform];
        const state = tokenState[platform];
        const badge = getStatusBadge(tokenInfo.status);

        return (
          <div
            key={platform}
            className="p-[16px] rounded-[8px] border border-[#eae7e0] mb-[12px] last:mb-0"
          >
            {/* Platform header */}
            <div className="flex items-center justify-between mb-[10px]">
              <div className="flex items-center gap-[8px]">
                <div
                  className="w-[28px] h-[28px] rounded-[7px] grid place-items-center flex-shrink-0"
                  style={{ backgroundColor: config.iconBg, color: config.iconColor }}
                >
                  <Icon size={15} />
                </div>
                <span className="text-[0.88rem] font-semibold text-[#2d2d2a]">
                  {t(`tokens.${platform}Name`)}
                </span>
              </div>
              <span
                className={`text-[0.68rem] font-semibold py-[3px] px-[10px] rounded-[5px] flex items-center gap-[4px] ${badge.className}`}
              >
                {badge.icon}
                {badge.text}
              </span>
            </div>

            {/* Last synced */}
            {tokenInfo.last_verified_at && (
              <div className="text-[0.72rem] text-[#9b9b94] mb-[10px]">
                {t("tokens.lastSynced", {
                  time: formatDistanceToNow(new Date(tokenInfo.last_verified_at), { locale: dateFnsLocale }),
                })}
              </div>
            )}

            {/* Token input row */}
            <div className="flex items-center gap-[8px]">
              <div className="relative flex-1">
                <input
                  type={state.visible ? "text" : "password"}
                  value={state.value}
                  onChange={(e) => {
                    state.setValue(e.target.value);
                    state.setError("");
                  }}
                  placeholder={t(`tokens.${platform}Placeholder`)}
                  className="w-full font-mono text-[0.8rem] py-[9px] px-[12px] pr-[34px] border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none transition-claude-fast placeholder:font-sans placeholder:text-[#9b9b94] focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,.11)]"
                />
                <button
                  type="button"
                  data-testid={`token-toggle-${platform}`}
                  onClick={() => state.setVisible(!state.visible)}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#9b9b94] p-[2px] hover:text-[#6b6b65]"
                >
                  {state.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                disabled={!state.value.trim()}
                onClick={() => handleUpdate(platform)}
                className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] cursor-pointer transition-claude-fast whitespace-nowrap bg-[#d97757] text-white border-none hover:bg-[#c5674a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("tokens.update")}
              </button>
            </div>

            {/* Validation error */}
            {state.error && (
              <p className="text-[0.72rem] text-[#cc4455] mt-[4px]">{state.error}</p>
            )}
          </div>
        );
      })}

      {/* Sync Now button */}
      <div className="mt-[16px]">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncTrigger.isPending}
          className="w-full flex items-center justify-center gap-[8px] py-[10px] text-[0.82rem] font-semibold text-[#6b6b65] bg-[#faf9f5] border border-[#e8e5dd] rounded-[8px] cursor-pointer transition-claude-fast hover:bg-[#efede6] hover:text-[#2d2d2a] disabled:opacity-70"
        >
          <RefreshCw
            size={14}
            className={syncTrigger.isPending ? "animate-spin" : ""}
          />
          {syncTrigger.isPending ? t("tokens.syncing") : t("tokens.syncNow")}
        </button>
      </div>
    </div>
  );
}
