"use client";

import { useState, useCallback, useEffect } from "react";
import { User } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useCurrentUser, useUpdateUser } from "@/lib/hooks/useUser";
import { formatDeadline } from "@/lib/utils/dates";

/**
 * User profile settings: display name, email (read-only), and account info.
 * Password change UI is shown but disabled (backend endpoint not yet available).
 */
export default function UserProfile() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [saved, setSaved] = useState(false);

  // Sync when user data loads
  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user?.display_name]);

  const handleSave = useCallback(async () => {
    if (!displayName.trim()) return;
    try {
      await updateUser.mutateAsync({ display_name: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handled by TanStack Query
    }
  }, [displayName, updateUser]);

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <User size={20} style={{ color: "var(--color-text-2)" }} />
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Profile
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-3)" }}>
        Your account information
      </p>

      <div className="space-y-4">
        {/* Display name */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-3)" }}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-[var(--radius-sm)]"
            style={{
              border: "1px solid var(--color-card-border)",
              background: "var(--color-cream)",
              color: "var(--color-text-1)",
            }}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-3)" }}>
            Email
          </label>
          <input
            type="email"
            value={user?.email ?? ""}
            readOnly
            className="w-full text-sm px-3 py-2 rounded-[var(--radius-sm)] opacity-60"
            style={{
              border: "1px solid var(--color-card-border)",
              background: "var(--color-card-bg-hover)",
              color: "var(--color-text-2)",
            }}
          />
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
            Email cannot be changed
          </p>
        </div>

        {/* Password change (disabled, coming soon) */}
        <div className="opacity-50">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-3)" }}>
            Password
          </label>
          <input
            type="password"
            placeholder="Current password"
            disabled
            className="w-full text-sm px-3 py-2 rounded-[var(--radius-sm)] mb-2"
            style={{
              border: "1px solid var(--color-card-border)",
              background: "var(--color-card-bg-hover)",
              color: "var(--color-text-2)",
            }}
          />
          <input
            type="password"
            placeholder="New password"
            disabled
            className="w-full text-sm px-3 py-2 rounded-[var(--radius-sm)]"
            style={{
              border: "1px solid var(--color-card-border)",
              background: "var(--color-card-bg-hover)",
              color: "var(--color-text-2)",
            }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-3)" }}>
            Password change coming soon
          </p>
        </div>

        {/* Save + account info */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--color-divider)" }}>
          <div>
            <button
              onClick={handleSave}
              disabled={updateUser.isPending}
              className="px-4 py-2 text-sm rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--color-orange)",
                color: "white",
              }}
            >
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-xs ml-2" style={{ color: "var(--color-green)" }}>
                Saved!
              </span>
            )}
          </div>
          {user?.created_at && (
            <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
              Account created: {formatDeadline(user.created_at)}
            </span>
          )}
        </div>
      </div>
    </RoughCard>
  );
}
