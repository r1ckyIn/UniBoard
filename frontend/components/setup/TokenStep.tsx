"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Shield, AlertCircle, WifiOff } from "lucide-react";
import { toast } from "sonner";
import TokenInput from "./TokenInput";
import {
  validateCanvasToken,
  validateEdToken,
} from "@/lib/validations/token";
import { useConfigureToken } from "@/hooks/use-user";
import {
  hashToken,
  isTokenCachedAndFresh,
  readTokenCache,
  writeTokenCache,
  clearTokenCache,
  type Platform,
} from "@/lib/setup/tokenCache";

type FieldStatus = "idle" | "valid" | "invalid";
type FailureMode = "invalid" | "unreachable" | null;

interface FieldFailure {
  mode: FailureMode;
  message?: string;
}

function resetField(
  setValue: (v: string) => void,
  setStatus: (s: FieldStatus) => void,
  setFailure: (f: FieldFailure) => void,
  platform: Platform,
) {
  setValue("");
  setStatus("idle");
  setFailure({ mode: null });
  // Editing/clearing the token also invalidates any cached validation —
  // any new token must be re-validated against the backend.
  clearTokenCache(platform);
}

// Type-guard helpers for ky HTTPError (carries response.status)
function getStatusFromError(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { status?: number } }).response;
    if (resp !== undefined && typeof resp.status === "number") {
      return resp.status;
    }
  }
  return undefined;
}

function isInvalidTokenError(err: unknown): boolean {
  const status = getStatusFromError(err);
  return status === 401 || status === 422;
}

function isRetryableError(err: unknown): boolean {
  const status = getStatusFromError(err);
  // Network / unknown failure (no status) OR 5xx server error.
  return status === undefined || status >= 500;
}

// Exponential-backoff helper for transient (network/5xx) failures.
async function submitWithBackoff(
  submit: () => Promise<unknown>,
): Promise<void> {
  const delays = [2000, 4000, 8000];
  for (let i = 0; i <= delays.length; i++) {
    try {
      await submit();
      return;
    } catch (err) {
      const retryable = isRetryableError(err);
      if (!retryable || i === delays.length) {
        throw err;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, delays[i]));
    }
  }
}

interface TokenStepProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function TokenStep({ onBack, onSuccess }: TokenStepProps) {
  const t = useTranslations("setup.tokens");
  const abortRef = useRef(false);
  const configureToken = useConfigureToken();

  const [canvasValue, setCanvasValue] = useState("");
  const [edValue, setEdValue] = useState("");
  const [canvasStatus, setCanvasStatus] = useState<FieldStatus>("idle");
  const [edStatus, setEdStatus] = useState<FieldStatus>("idle");
  const [canvasFailure, setCanvasFailure] = useState<FieldFailure>({ mode: null });
  const [edFailure, setEdFailure] = useState<FieldFailure>({ mode: null });
  const [validating, setValidating] = useState(false);

  // Wrap configureToken.mutateAsync with cache lookup + backoff.
  // Returns true on success, throws on hard failure (after retries).
  const validatePlatform = async (
    platform: Platform,
    token: string,
  ): Promise<boolean> => {
    // Skip backend round-trip when we already validated this exact
    // token in the current session within the TTL window.
    const cached = await isTokenCachedAndFresh(platform, token);
    if (cached) {
      toast.success(t("alreadyValidated"));
      return true;
    }

    await submitWithBackoff(async () => {
      await configureToken.mutateAsync({
        platform,
        body: { token: token.trim() },
      });
    });

    // Persist the validated token's hash for skip-revalidate on subsequent visits.
    const hash = await hashToken(token);
    writeTokenCache(platform, hash);
    return true;
  };

  const handleValidate = async () => {
    abortRef.current = false;
    setValidating(true);
    setCanvasStatus("idle");
    setEdStatus("idle");
    setCanvasFailure({ mode: null });
    setEdFailure({ mode: null });

    try {
      // ── Canvas ──────────────────────────────────────────────────────
      const canvasRegexValid = validateCanvasToken(canvasValue);
      if (!canvasRegexValid) {
        setCanvasStatus("invalid");
        setCanvasFailure({ mode: "invalid", message: t("errors.canvas") });
        return;
      }

      try {
        await validatePlatform("canvas", canvasValue);
        if (abortRef.current) return;
        setCanvasStatus("valid");
      } catch (err) {
        if (abortRef.current) return;
        setCanvasStatus("invalid");
        if (isInvalidTokenError(err)) {
          setCanvasFailure({
            mode: "invalid",
            message: (err as Error).message || t("errors.canvas"),
          });
        } else {
          setCanvasFailure({ mode: "unreachable" });
        }
        return;
      }

      // ── Ed ──────────────────────────────────────────────────────────
      const edRegexValid = validateEdToken(edValue);
      if (!edRegexValid) {
        setEdStatus("invalid");
        setEdFailure({ mode: "invalid", message: t("errors.ed") });
        return;
      }

      try {
        await validatePlatform("ed", edValue);
        if (abortRef.current) return;
        setEdStatus("valid");
      } catch (err) {
        if (abortRef.current) return;
        setEdStatus("invalid");
        if (isInvalidTokenError(err)) {
          setEdFailure({
            mode: "invalid",
            message: (err as Error).message || t("errors.ed"),
          });
        } else {
          setEdFailure({ mode: "unreachable" });
        }
        return;
      }

      // Both validated successfully.
      onSuccess();
    } finally {
      setValidating(false);
    }
  };

  const handleBack = () => {
    abortRef.current = true;
    setValidating(false);
    onBack();
  };

  // Inline retry handler used by both invalid-token and unreachable panels.
  const handleRetry = () => {
    void handleValidate();
  };

  // Read the cache once for "last validated" timestamp display.
  const cache = readTokenCache();
  const formatLastValidated = (platform: Platform): string => {
    const entry = cache[platform];
    if (entry === undefined) {
      return t("invalid.lastValidatedNever");
    }
    try {
      return new Date(entry.validatedAt).toLocaleString();
    } catch {
      return t("invalid.lastValidatedNever");
    }
  };

  // Map platform key to display label for {platform} placeholder in i18n strings.
  const platformLabel: Record<Platform, string> = {
    canvas: "Canvas",
    ed: "Ed Discussion",
  };

  return (
    <div>
      <h2 className="text-[21px] font-serif font-semibold text-text-1 text-center">
        {t("title")}
      </h2>

      <p className="text-base text-text-2 leading-[1.6] text-center mt-2 mb-6">
        {t("description")}
      </p>

      <div className="mb-5">
        <TokenInput
          platform="canvas"
          value={canvasValue}
          onChange={(v) => {
            setCanvasValue(v);
            // Any keystroke invalidates cached validation for canvas.
            clearTokenCache("canvas");
          }}
          status={canvasStatus}
          error={canvasFailure.mode === "invalid" ? canvasFailure.message : undefined}
          onClear={() => {
            resetField(setCanvasValue, setCanvasStatus, setCanvasFailure, "canvas");
          }}
        />
        {canvasFailure.mode === "invalid" && (
          <FailurePanel
            kind="invalid"
            platformLabel={platformLabel.canvas}
            lastValidated={formatLastValidated("canvas")}
            onRetry={handleRetry}
            disabled={validating}
            t={t}
          />
        )}
        {canvasFailure.mode === "unreachable" && (
          <FailurePanel
            kind="unreachable"
            platformLabel={platformLabel.canvas}
            onRetry={handleRetry}
            disabled={validating}
            t={t}
          />
        )}
      </div>

      <div className="mb-6">
        <TokenInput
          platform="ed"
          value={edValue}
          onChange={(v) => {
            setEdValue(v);
            clearTokenCache("ed");
          }}
          status={edStatus}
          error={edFailure.mode === "invalid" ? edFailure.message : undefined}
          onClear={() => {
            resetField(setEdValue, setEdStatus, setEdFailure, "ed");
          }}
        />
        {edFailure.mode === "invalid" && (
          <FailurePanel
            kind="invalid"
            platformLabel={platformLabel.ed}
            lastValidated={formatLastValidated("ed")}
            onRetry={handleRetry}
            disabled={validating}
            t={t}
          />
        )}
        {edFailure.mode === "unreachable" && (
          <FailurePanel
            kind="unreachable"
            platformLabel={platformLabel.ed}
            onRetry={handleRetry}
            disabled={validating}
            t={t}
          />
        )}
      </div>

      <div className="flex gap-3 p-4 rounded-lg bg-[rgba(120,140,93,.04)] border border-[rgba(120,140,93,.12)]">
        <Shield size={16} className="text-[#788c5d] mt-0.5 flex-shrink-0" />
        <p className="text-base text-text-2 leading-[1.6]">
          <span className="font-semibold text-text-1">{t("security.title")}</span>{" "}
          {t("security.description")}
        </p>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={handleBack}
          className="bg-transparent border-[1.5px] border-card-border text-text-2 font-semibold py-3 px-6 rounded-lg hover:bg-card-bg-hover hover:text-text-1 transition-claude-fast"
        >
          {t("back")}
        </button>

        <button
          type="button"
          onClick={handleValidate}
          disabled={validating}
          className={
            validating
              ? "bg-[#d97757] text-white font-semibold py-3 px-7 rounded-lg opacity-60 cursor-default"
              : "bg-[#d97757] hover:bg-[#c5674a] text-white font-semibold py-3 px-7 rounded-lg transition-claude-fast hover:-translate-y-px"
          }
        >
          {validating ? t("validating") : t("cta")}
        </button>
      </div>
    </div>
  );
}

// ── Failure panel subcomponent ────────────────────────────────────────────

interface FailurePanelProps {
  kind: "invalid" | "unreachable";
  platformLabel: string;
  lastValidated?: string;
  onRetry: () => void;
  disabled: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}

function FailurePanel({
  kind,
  platformLabel,
  lastValidated,
  onRetry,
  disabled,
  t,
}: FailurePanelProps) {
  if (kind === "invalid") {
    return (
      <div
        role="alert"
        data-testid={`failure-invalid-${platformLabel.toLowerCase().replace(/\s+/g, "-")}`}
        className="mt-3 p-3 rounded-lg bg-[rgba(217,119,87,.06)] border border-[rgba(217,119,87,.18)]"
      >
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-[#d97757] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-1">{t("invalid.title")}</p>
            {lastValidated !== undefined && (
              <p className="text-xs text-text-3 mt-0.5">
                {t("invalid.lastValidated", { when: lastValidated })}
              </p>
            )}
            <ul className="text-xs text-text-2 mt-2 space-y-0.5 list-disc list-inside">
              <li>{t("invalid.tip1")}</li>
              <li>{t("invalid.tip2")}</li>
              <li>{t("invalid.tip3")}</li>
            </ul>
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
              className="mt-2 text-xs font-semibold text-[#d97757] hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {t("invalid.testConnection")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      data-testid={`failure-unreachable-${platformLabel.toLowerCase().replace(/\s+/g, "-")}`}
      className="mt-3 p-3 rounded-lg bg-[rgba(106,155,204,.06)] border border-[rgba(106,155,204,.18)]"
    >
      <div className="flex items-start gap-2">
        <WifiOff size={16} className="text-[#6a9bcc] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-1">
            {t("unreachable.title", { platform: platformLabel })}
          </p>
          <p className="text-xs text-text-3 mt-0.5">
            {t("unreachable.body", { platform: platformLabel })}
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={disabled}
            className="mt-2 text-xs font-semibold text-[#6a9bcc] hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {t("unreachable.retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
