"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_CONFIG } from "./platform-config";

interface TokenInputProps {
  platform: "canvas" | "ed";
  value: string;
  onChange: (value: string) => void;
  status: "idle" | "valid" | "invalid";
  error?: string;
  onClear?: () => void;
}

export default function TokenInput({
  platform,
  value,
  onChange,
  status,
  error,
  onClear,
}: TokenInputProps) {
  const t = useTranslations("setup.tokens");
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: config.iconBg }}
        >
          <Icon size={14} style={{ color: config.iconColor }} />
        </div>
        <label className="text-sm font-semibold text-text-2">
          {t(`${platform}.label`)}
        </label>
      </div>

      <div className="flex items-center relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(`${platform}.placeholder`)}
          className={cn(
            "w-full font-mono text-sm py-3 px-4 border-[1.5px] rounded-lg bg-cream transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] placeholder:font-sans",
            "outline-none focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,.11)]",
            status === "idle" && "border-card-border",
            status === "valid" && "border-[#788c5d]",
            status === "invalid" && "border-[#cc4455]",
          )}
        />
        {status === "valid" && (
          <div
            data-testid={`status-valid-${platform}`}
            className="absolute right-3 flex-shrink-0"
          >
            <CheckCircle size={20} className="text-[#788c5d]" />
          </div>
        )}
        {status === "invalid" && (
          onClear ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear input"
              data-testid={`status-invalid-${platform}`}
              className="absolute right-3 flex-shrink-0 cursor-pointer"
            >
              <XCircle size={20} className="text-[#cc4455]" />
            </button>
          ) : (
            <div
              data-testid={`status-invalid-${platform}`}
              className="absolute right-3 flex-shrink-0"
            >
              <XCircle size={20} className="text-[#cc4455]" />
            </div>
          )
        )}
      </div>

      {error && (
        <p className="text-sm text-[#cc4455] mt-1" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
