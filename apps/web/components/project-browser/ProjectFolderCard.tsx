import type { KeyboardEvent, MouseEvent } from "react";
import type { ProjectFolder } from "@/lib/types";
import { FolderGlyph } from "./ProjectBrowserGlyphs";

type ProjectFileView = "grid" | "list";
type ProjectFolderWithFileCount = ProjectFolder & { recursive_asset_count?: number };

function getAssetTypeLabel(assetType: string | null | undefined) {
  if (assetType === "song") return "Music";
  if (assetType === "sound-fx") return "Sound FX";
  if (assetType === "visual-fx") return "Visual FX";
  if (assetType === "colour-grading") return "Colour Grading";
  return "Folder";
}

function formatFileCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`;
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
  const totalItems = (folder.child_count ?? 0) + (folder.asset_count ?? 0);
  const recursiveFileCount = folder.recursive_asset_count ?? folder.asset_count ?? 0;

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
          <FolderGlyph small />
          <span className="project-browser-row-title">{folder.name}</span>
        </span>
        <span className="project-browser-row-muted">{totalItems || "--"}</span>
        <span className="project-browser-row-muted">{getAssetTypeLabel(folder.asset_type)}</span>
        <span className="project-folder-action-wrap" />
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
