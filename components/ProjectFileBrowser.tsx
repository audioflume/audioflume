"use client";

import { useMemo } from "react";
import FolderIcon from "@/components/icons/FolderIcon";
import {
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import type { ProjectAsset, ProjectFolder, Song } from "@/lib/types";

type ProjectFileView = "grid" | "list";

type ProjectSong = Song & {
  project_asset_id?: number;
  project_id?: number;
  project_position?: number;
  project_added_at?: string;
  project_notes?: string | null;
  project_folder_id?: number | null;
};

type ProjectFileBrowserProps = {
  folders: ProjectFolder[];
  assets: ProjectAsset[];
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  activeFolderId: number | null;
  viewMode: ProjectFileView;
  onViewModeChange: (mode: ProjectFileView) => void;
  onOpenFolder: (folderId: number | null) => void;
  onMoveSong: (song: ProjectSong) => void;
  onCreateFolder: () => void;
};

function getAssetTypeLabel(assetType: string | null | undefined) {
  if (assetType === "song") return "Music";
  if (assetType === "sound-fx") return "Sound FX";
  if (assetType === "visual-fx") return "Visual FX";
  if (assetType === "colour-grading") return "Colour Grading";
  return "Folder";
}

function formatSongMeta(song: ProjectSong) {
  const parts = [song.artist, "Music"];

  if (song.key) parts.push(song.key);
  if (song.bpm) parts.push(`${song.bpm} BPM`);

  return parts.filter(Boolean).join(" · ");
}

function FolderCard({
  folder,
  onOpen,
}: {
  folder: ProjectFolder;
  onOpen: (folderId: number) => void;
}) {
  const totalItems = (folder.child_count ?? 0) + (folder.asset_count ?? 0);

  return (
    <button
      type="button"
      className="project-folder-card"
      onClick={() => onOpen(folder.id)}
    >
      <span className="project-folder-icon">
        <FolderIcon />
      </span>
      <span className="project-folder-copy">
        <span className="project-folder-name">{folder.name}</span>
        <span className="project-folder-meta">
          {getAssetTypeLabel(folder.asset_type)} · {totalItems}{" "}
          {totalItems === 1 ? "item" : "items"}
        </span>
      </span>
    </button>
  );
}

function SongFileCard({
  song,
  viewMode,
  onMove,
}: {
  song: ProjectSong;
  viewMode: ProjectFileView;
  onMove: (song: ProjectSong) => void;
}) {
  if (viewMode === "list") {
    return (
      <div className="project-file-row">
        <div className="project-file-icon">♪</div>
        <div className="project-file-main">
          <div className="project-file-name">{song.title}</div>
          <div className="project-file-meta">{formatSongMeta(song)}</div>
        </div>
        <div className="project-file-list-meta">
          {song.duration ? `${Math.round(song.duration)}s` : "—"}
        </div>
        <button
          type="button"
          className="project-file-action"
          onClick={() => onMove(song)}
        >
          Move
        </button>
      </div>
    );
  }

  return (
    <div className="project-file-card">
      <div className="project-file-card-top">
        <div className="project-file-card-icon">♪</div>
        <button
          type="button"
          className="project-file-action"
          onClick={() => onMove(song)}
        >
          Move
        </button>
      </div>
      <div>
        <div className="project-file-card-title">{song.title}</div>
        <div className="project-file-card-meta">{formatSongMeta(song)}</div>
      </div>
    </div>
  );
}

export default function ProjectFileBrowser({
  folders,
  assets,
  songs,
  loading,
  error,
  activeFolderId,
  viewMode,
  onViewModeChange,
  onOpenFolder,
  onMoveSong,
  onCreateFolder,
}: ProjectFileBrowserProps) {
  const foldersById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const breadcrumbFolders = useMemo(() => {
    if (activeFolderId == null) return [];

    const chain: ProjectFolder[] = [];
    const visited = new Set<number>();
    let current = foldersById.get(activeFolderId) ?? null;

    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current =
        current.parent_folder_id == null
          ? null
          : foldersById.get(current.parent_folder_id) ?? null;
    }

    return chain;
  }, [activeFolderId, foldersById]);

  const visibleFolders = useMemo(
    () => folders.filter((folder) => folder.parent_folder_id === activeFolderId),
    [folders, activeFolderId],
  );

  const visibleSongs = useMemo(
    () => songs.filter((song) => (song.project_folder_id ?? null) === activeFolderId),
    [songs, activeFolderId],
  );

  if (loading) {
    return (
      <div className="project-file-browser">
        <div className="project-file-browser-top">
          <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
          <div className="project-tab-skeleton project-skeleton-block" />
        </div>
        <div className="project-folder-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="project-folder-card skeleton-card">
              <div className="project-folder-icon project-skeleton-block" />
              <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-empty">
        <h2>Couldn&apos;t load project folders</h2>
        <p>{error}</p>
      </div>
    );
  }

  const activeFolder = activeFolderId == null ? null : foldersById.get(activeFolderId);
  const unassignedAssetCount = assets.filter((asset) => asset.folder_id == null).length;

  return (
    <div className="project-file-browser">
      <div className="project-file-browser-top">
        <div className="project-file-browser-title-wrap">
          <div className="project-file-browser-kicker">All Files</div>
          <h2>{activeFolder?.name || "Project Files"}</h2>
          <div className="project-breadcrumbs">
            <button type="button" onClick={() => onOpenFolder(null)}>
              Root
            </button>
            {breadcrumbFolders.map((folder) => (
              <span key={folder.id}>
                <span>/</span>
                <button type="button" onClick={() => onOpenFolder(folder.id)}>
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="project-file-browser-actions">
          <div className="project-view-toggle">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={viewMode === "grid" ? "is-active" : ""}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={viewMode === "list" ? "is-active" : ""}
            >
              List
            </button>
          </div>

          <button
            type="button"
            className={`${filterTriggerBaseClass} ${filterTriggerInactiveClass}`}
            onClick={onCreateFolder}
          >
            New Folder
          </button>
        </div>
      </div>

      <div className="project-file-browser-section">
        <div className="project-file-section-heading">
          <span>Folders</span>
          <span>{visibleFolders.length}</span>
        </div>

        {visibleFolders.length > 0 ? (
          <div className="project-folder-grid">
            {visibleFolders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} onOpen={onOpenFolder} />
            ))}
          </div>
        ) : (
          <div className="project-file-empty-inline">No folders here yet.</div>
        )}
      </div>

      <div className="project-file-browser-section">
        <div className="project-file-section-heading">
          <span>Files</span>
          <span>
            {activeFolderId == null
              ? `${unassignedAssetCount} at root`
              : `${visibleSongs.length} music ${visibleSongs.length === 1 ? "file" : "files"}`}
          </span>
        </div>

        {visibleSongs.length > 0 ? (
          <div className={viewMode === "grid" ? "project-file-grid" : "project-file-list"}>
            {visibleSongs.map((song) => (
              <SongFileCard
                key={song.project_asset_id ?? song.id}
                song={song}
                viewMode={viewMode}
                onMove={onMoveSong}
              />
            ))}
          </div>
        ) : (
          <div className="project-file-empty-inline">
            {activeFolderId == null
              ? "Files added directly to the project root will appear here."
              : "No music files in this folder yet."}
          </div>
        )}
      </div>
    </div>
  );
}
