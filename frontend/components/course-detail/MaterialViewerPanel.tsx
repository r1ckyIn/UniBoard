"use client";

import { useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MaterialViewerPanelProps {
  url: string | null;
  title: string;
  onClose: () => void;
}

/**
 * Slide-out panel for previewing course materials inline via iframe.
 * Positioned fixed on the right side, slides in/out with CSS transition.
 * Supports close via button click or Escape key.
 */
export default function MaterialViewerPanel({
  url,
  title,
  onClose,
}: MaterialViewerPanelProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!url) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [url, handleKeyDown]);

  return (
    <div
      data-testid="material-viewer-panel"
      className={cn(
        "fixed right-0 bottom-0 bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.08)] z-50",
        "transition-transform duration-300 ease-out",
        url ? "translate-x-0" : "translate-x-full"
      )}
      style={{
        top: "var(--spacing-header-h, 56px)",
        width: "min(600px, 50vw)",
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#eae7e0]">
        <span className="text-[0.84rem] font-semibold text-[#2d2d2a] truncate max-w-[70%]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {/* Open in new tab fallback */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.72rem] text-[#9b9b94] hover:text-[#d97757] transition-colors flex items-center gap-1"
            >
              <ExternalLink size={14} />
            </a>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] grid place-items-center text-[#9b9b94] hover:bg-[#efede6] hover:text-[#2d2d2a] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iframe content */}
      {url && (
        <iframe
          src={url}
          className="w-full border-none"
          style={{ height: "calc(100% - 49px)" }}
          sandbox="allow-same-origin allow-scripts allow-popups"
          title={title}
        />
      )}
    </div>
  );
}
