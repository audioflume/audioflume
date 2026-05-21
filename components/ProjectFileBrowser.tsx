"use client";

import { useMemo } from "react";
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

function FolderGlyph({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "project-folder-glyph small" : "project-folder-glyph"}>
      <span className="project-folder-glyph-tab" />
      <span className="project-folder-glyph-body" />
    </span>
  );
}

function MusicGlyph({ small = false }: { small?: boolean }) {
  return <span className={small ? "project-music-glyph small" : "project-music-glyph"}>♪</span>;
}

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
      <button
        type="button"
        className="project-browser-row project-folder-row"
        onClick={() => onOpen(folder.id)}
      >
        <span className="project-browser-row-name">
          <FolderGlyph small />
          <span className="project-browser-row-title">{folder.name}</span>
        </span>
        <span className="project-browser-row-muted">{totalItems || "--"}</span>
        <span className="project-browser-row-muted">{getAssetTypeLabel(folder.asset_type)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="project-folder-card"
      onClick={() => onOpen(folder.id)}
    >
      <FolderGlyph />
      <span className="project-folder-card-name">{folder.name}</span>
      <span className="project-folder-card-meta">
        {totalItems} {totalItems === 1 ? "item" : "items"}
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
      <div className="project-browser-row project-file-row">
        <span className="project-browser-row-name">
          <MusicGlyph small />
          <span className="project-browser-row-title">{song.title}</span>
        </span>
        <span className="project-browser-row-muted">{song.artist || "--"}</span>
        <span className="project-browser-row-muted">Music</span>
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
      <div className="project-file-card-icon-wrap">
        <MusicGlyph />
      </div>
      <div className="project-file-card-title">{song.title}</div>
      <div className="project-file-card-meta">{formatSongMeta(song)}</div>
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
        <div className="project-browser-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="project-folder-card skeleton-card">
              <div className="project-skeleton-block h-[58px] w-[82px] rounded-[10px]" />
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
  const itemCount = visibleFolders.length + visibleSongs.length;

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
          <span>{viewMode === "grid" ? "Items" : "Name"}</span>
          <span>
            {activeFolderId == null
              ? `${itemCount} items · ${unassignedAssetCount} at root`
              : `${itemCount} items`}
          </span>
        </div>

        {itemCount > 0 ? (
          viewMode === "grid" ? (
            <div className="project-browser-grid">
              {visibleFolders.map((folder) => (
                <FolderCard
                  key={`folder-${folder.id}`}
                  folder={folder}
                  viewMode={viewMode}
                  onOpen={onOpenFolder}
                />
              ))}
              {visibleSongs.map((song) => (
                <SongFileCard
                  key={`song-${song.project_asset_id ?? song.id}`}
                  song={song}
                  viewMode={viewMode}
                  onMove={onMoveSong}
                />
              ))}
            </div>
          ) : (
            <div className="project-browser-list">
              <div className="project-browser-list-head">
                <span>Name</span>
                <span>Info</span>
                <span>Kind</span>
                <span />
              </div>
              {visibleFolders.map((folder) => (
                <FolderCard
                  key={`folder-${folder.id}`}
                  folder={folder}
                  viewMode={viewMode}
                  onOpen={onOpenFolder}
                />
              ))}
              {visibleSongs.map((song) => (
                <SongFileCard
                  key={`song-${song.project_asset_id ?? song.id}`}
                  song={song}
                  viewMode={viewMode}
                  onMove={onMoveSong}
                />
              ))}
            </div>
          )
        ) : (
          <div className="project-file-empty-inline">
            {activeFolderId == null
              ? "Files added directly to the project root will appear here."
              : "No files in this folder yet."}
          </div>
        )}
      </div>
    </div>
  );
}
