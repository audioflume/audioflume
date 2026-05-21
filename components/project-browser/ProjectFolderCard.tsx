import type { ProjectFolder } from "@/lib/types";
import { FolderGlyph } from "./ProjectBrowserGlyphs";

type ProjectFileView = "grid" | "list";

function getAssetTypeLabel(assetType: string | null | undefined) {
  if (assetType === "song") return "Music";
  if (assetType === "sound-fx") return "Sound FX";
  if (assetType === "visual-fx") return "Visual FX";
  if (assetType === "colour-grading") return "Colour Grading";
  return "Folder";
}

export default function ProjectFolderCard({
  folder,
  viewMode,
  onOpen,
}: {
  folder: ProjectFolder;
  viewMode: ProjectFileView;
  onOpen: (folderId: number) => void;
}) {
  const totalItems = (folder.child_count ?? 0) + (folder.asset_count ?? 0);

  if (viewMode === "list") {
    return (
      <button type="button" className="project-browser-row project-folder-row" onClick={() => onOpen(folder.id)}>
        <span className="project-browser-row-name">
          <FolderGlyph small />
          <span className="project-browser-row-title">{folder.name}</span>
        </span>
        <span className="project-browser-row-muted">{totalItems || "--"}</span>
        <span className="project-browser-row-muted">{getAssetTypeLabel(folder.asset_type)}</span>
        <span />
      </button>
    );
  }

  return (
    <button type="button" className="project-folder-card" onClick={() => onOpen(folder.id)}>
      <FolderGlyph />
      <span className="project-folder-card-name">{folder.name}</span>
      <span className="project-folder-card-meta">
        {totalItems} {totalItems === 1 ? "item" : "items"}
      </span>
    </button>
  );
}
