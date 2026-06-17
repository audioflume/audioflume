import type { KeyboardEvent, MouseEvent } from "react";
import type { ProjectFolder } from "@/lib/types";
import { FolderGlyph } from "./ProjectBrowserGlyphs";

type ProjectFileView = "grid" | "list";
type ProjectFolderWithFileCount = ProjectFolder & { recursive_asset_count?: number };

function formatFileCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "—";

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "—";

  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectFolderCard({
  folder,
  viewMode,
  onOpen,
  onContextMenu,
}: {
  folder: ProjectFolderWithFileCount;
  viewMode: ProjectFileView;
  onOpen: (folderId: number) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, folder: ProjectFolderWithFileCount) => void;
}) {
  const recursiveFileCount = folder.recursive_asset_count ?? folder.asset_count ?? 0;
  const lastModified = formatRelativeDate(folder.updated_at ?? folder.created_at);

  function handleOpen() {
    onOpen(folder.id);
  }

  function handleOpenKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpen();
  }

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    onContextMenu?.(event, folder);
  }

  if (viewMode === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        className="project-browser-row project-folder-row"
        onClick={handleOpen}
        onKeyDown={handleOpenKeyDown}
        onContextMenu={handleContextMenu}
      >
        <span className="project-browser-row-name">
          <span className="project-browser-row-icon project-browser-row-folder-icon">
            <FolderGlyph small />
          </span>
          <span className="project-browser-row-title-wrap">
            <span className="project-browser-row-title">{folder.name}</span>
            <span className="project-browser-row-subtitle">{formatFileCount(recursiveFileCount)}</span>
          </span>
        </span>
        <span className="project-browser-row-size">—</span>
        <span className="project-browser-row-date">{lastModified}</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="project-folder-card"
      onClick={handleOpen}
      onKeyDown={handleOpenKeyDown}
      onContextMenu={handleContextMenu}
    >
      <span className="project-folder-card-icon-wrap">
        <FolderGlyph />
      </span>
      <span className="project-folder-card-name">{folder.name}</span>
      <span className="project-folder-card-meta">{formatFileCount(recursiveFileCount)}</span>
    </div>
  );
}
