"use client";

import { useState, useCallback, useEffect } from "react";
import { Target } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useCurrentUser, useUpdateUser } from "@/lib/hooks/useUser";
import { gradeBand } from "@/lib/utils/gpa";

/**
 * GPA target setting card.
 * Allows user to set a WAM target and see the corresponding grade band.
 */
export default function GPATargetSetting() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  const [target, setTarget] = useState<number>(user?.gpa_target ?? 75);
  const [saved, setSaved] = useState(false);

  // Sync local state when user data loads
  useEffect(() => {
    if (user?.gpa_target != null) {
      setTarget(user.gpa_target);
    }
  }, [user?.gpa_target]);

  const handleSave = useCallback(async () => {
    try {
      await updateUser.mutateAsync({ gpa_target: target });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handled by TanStack Query
    }
  }, [target, updateUser]);

  const band = gradeBand(target);

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Target size={20} style={{ color: "var(--color-orange)" }} />
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          GPA Target
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-3)" }}>
        Set your WAM target to track progress on the Predict page
      </p>

      {/* Current target display */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
            Current Target
          </p>
          <span
            className="text-3xl font-semibold tabular-nums"
            style={{ fontFamily: "monospace" }}
          >
            {user?.gpa_target != null ? user.gpa_target.toFixed(1) : "Not set"}
          </span>
        </div>
        {user?.gpa_target != null && (
          <span
            className="text-sm px-2 py-1 rounded"
            style={{
              background: "var(--color-green-soft)",
              color: "var(--color-green)",
            }}
          >
            {gradeBand(user.gpa_target)}
          </span>
        )}
      </div>

      {/* Target input */}
      <div className="flex items-center gap-3 mb-2">
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-[100px] text-sm text-right px-3 py-2 rounded-[var(--radius-sm)]"
          style={{
            fontFamily: "monospace",
            border: "1px solid var(--color-card-border)",
            background: "var(--color-cream)",
            color: "var(--color-text-1)",
          }}
        />
        <span className="text-sm" style={{ color: "var(--color-text-3)" }}>
          &rarr; {band}
        </span>
        <button
          onClick={handleSave}
          disabled={updateUser.isPending}
          className="px-4 py-2 text-sm rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50"
          style={{
            background: "var(--color-orange)",
            color: "white",
          }}
        >
          {updateUser.isPending ? "Saving..." : "Save Target"}
        </button>
        {saved && (
          <span className="text-xs" style={{ color: "var(--color-green)" }}>
            Saved!
          </span>
        )}
      </div>

      {/* GPA scale info */}
      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--color-divider)" }}>
        <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
          Scale: USYD 7-point (HD &ge; 85, D &ge; 75, CR &ge; 65, P &ge; 50)
        </p>
      </div>
    </RoughCard>
  );
}
