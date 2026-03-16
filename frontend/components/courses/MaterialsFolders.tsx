"use client";

import { useState } from "react";
import { Folder, FileText, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import type { CourseMaterialsResponse, FolderResponse } from "@/lib/api/types";

interface MaterialsFoldersProps {
  materials: CourseMaterialsResponse | undefined;
  isLoading: boolean;
}

/** Map item type string to an appropriate icon */
function itemIcon(type: string) {
  switch (type.toLowerCase()) {
    case "page":
      return <FileText size={14} style={{ color: "var(--color-blue)" }} />;
    case "lesson":
      return <BookOpen size={14} style={{ color: "var(--color-green)" }} />;
    default:
      return <FileText size={14} style={{ color: "var(--color-text-3)" }} />;
  }
}

/** Source badge component */
function SourceBadge({ source }: { source: string }) {
  const color = source === "canvas" ? "var(--color-orange)" : "var(--color-blue)";
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      {source}
    </span>
  );
}

/**
 * Collapsible folder accordion for course materials.
 * Each folder expands to show individual content items.
 */
export default function MaterialsFolders({
  materials,
  isLoading,
}: MaterialsFoldersProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  function toggleFolder(folderId: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3
          className="text-lg mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Course Materials
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-[var(--color-divider)] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  const folders = materials?.folders ?? [];

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Course Materials
      </h3>

      {folders.length === 0 ? (
        <p style={{ color: "var(--color-text-3)" }}>
          No materials available for this course.
        </p>
      ) : (
        <div className="space-y-2">
          {folders.map((folder: FolderResponse) => {
            const isOpen = openFolders.has(folder.id);
            return (
              <div key={folder.id}>
                {/* Folder header */}
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-[var(--color-card-bg-hover)] transition-colors text-left"
                >
                  {isOpen ? (
                    <ChevronDown size={14} style={{ color: "var(--color-text-3)" }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: "var(--color-text-3)" }} />
                  )}
                  <Folder size={16} style={{ color: "var(--color-amber)" }} />
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{ color: "var(--color-text-1)" }}
                  >
                    {folder.name}
                  </span>
                  <SourceBadge source={folder.source} />
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    {folder.item_count} items
                  </span>
                </button>

                {/* AI description */}
                {folder.ai_description && (
                  <p
                    className="ml-8 text-xs italic mb-1"
                    style={{ color: "var(--color-text-2)" }}
                  >
                    {folder.ai_description}
                  </p>
                )}

                {/* Expanded items list */}
                {isOpen && folder.items && (
                  <div className="ml-8 mt-1 space-y-1 pb-2">
                    {folder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-1.5 rounded text-sm"
                      >
                        {itemIcon(item.type)}
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: "var(--color-text-1)" }}
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-1)" }}>
                            {item.title}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </RoughCard>
  );
}
