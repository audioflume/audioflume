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

function ProjectFileBrowserStyles() {
  return (
    <style>{`
      .project-browser-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
        column-gap: 28px;
        row-gap: 34px;
        align-items: start;
      }

      .project-file-browser .project-folder-card {
        min-height: 0 !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 8px !important;
        border: 0 !important;
        border-radius: 10px !important;
        background: transparent !important;
        padding: 8px 6px !important;
        color: var(--text-primary);
        text-align: center !important;
        transform: none !important;
      }

      .project-file-browser .project-folder-card:hover {
        background: var(--bg-hover-strong) !important;
        border-color: transparent !important;
        transform: none !important;
      }

      .project-folder-glyph {
        position: relative;
        display: block;
        width: 84px;
        height: 62px;
        filter: drop-shadow(0 7px 10px rgba(0, 0, 0, 0.14));
      }

      .project-folder-glyph-tab {
        position: absolute;
        left: 4px;
        top: 4px;
        width: 37px;
        height: 13px;
        border-radius: 6px 8px 0 0;
        background: linear-gradient(180deg, #6ed0f3 0%, #2fa8dd 100%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
      }

      .project-folder-glyph-body {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 51px;
        border-radius: 7px;
        background: linear-gradient(180deg, #73d5f5 0%, #36b5e6 55%, #1597d0 100%);
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.55),
          inset 0 -1px 0 rgba(0, 0, 0, 0.16),
          0 1px 0 rgba(0, 0, 0, 0.18);
      }

      .project-folder-glyph.small {
        width: 22px;
        height: 17px;
        filter: none;
      }

      .project-folder-glyph.small .project-folder-glyph-tab {
        left: 1px;
        top: 1px;
        width: 10px;
        height: 4px;
        border-radius: 2px 3px 0 0;
      }

      .project-folder-glyph.small .project-folder-glyph-body {
        height: 14px;
        border-radius: 3px;
      }

      .project-folder-card-name {
        max-width: 112px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: var(--text-primary);
      }

      .project-folder-card-meta {
        display: none;
      }

      .project-file-browser .project-file-card {
        min-height: 0 !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 7px !important;
        border: 0 !important;
        border-radius: 10px !important;
        background: transparent !important;
        padding: 8px 6px !important;
        text-align: center !important;
        transform: none !important;
      }

      .project-file-browser .project-file-card:hover {
        background: var(--bg-hover-strong) !important;
        transform: none !important;
      }

      .project-file-card-icon-wrap {
        display: flex;
        height: 62px;
        align-items: center;
        justify-content: center;
      }

      .project-music-glyph {
        display: flex;
        height: 54px;
        width: 54px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: var(--bg-secondary);
        color: var(--text-secondary);
        box-shadow: inset 0 0 0 1px var(--border);
        font-size: 24px;
      }

      .project-music-glyph.small {
        height: 22px;
        width: 22px;
        border-radius: 5px;
        font-size: 12px;
      }

      .project-file-browser .project-file-card-title {
        max-width: 112px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal !important;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.15;
        color: var(--text-primary);
      }

      .project-file-browser .project-file-card-meta {
        max-width: 112px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 0 !important;
        font-size: 10px;
        color: var(--text-muted);
      }

      .project-browser-list {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--bg-secondary);
      }

      .project-browser-list-head,
      .project-browser-row {
        display: grid !important;
        grid-template-columns: minmax(220px, 1fr) minmax(140px, 220px) 120px 78px !important;
        align-items: center !important;
        gap: 14px !important;
      }

      .project-browser-list-head {
        min-height: 34px;
        padding: 0 14px;
        border-bottom: 1px solid var(--border);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-muted);
      }

      .project-browser-row {
        width: 100%;
        min-height: 34px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--border-subtle) !important;
        border-radius: 0 !important;
        background: transparent !important;
        padding: 0 14px !important;
        text-align: left;
        transition: background 0.15s ease;
      }

      .project-browser-row:last-child {
        border-bottom: 0 !important;
      }

      .project-browser-row:hover {
        background: var(--bg-hover-strong) !important;
      }

      .project-browser-row-name {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
      }

      .project-browser-row-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .project-browser-row-muted {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        color: var(--text-secondary);
      }

      .project-file-browser .project-file-action {
        height: 24px !important;
        cursor: pointer;
        border: 1px solid var(--border) !important;
        border-radius: 7px !important;
        background: transparent !important;
        padding: 0 9px !important;
        font-size: 10px !important;
        color: var(--text-secondary) !important;
      }

      .project-file-browser .project-file-card .project-file-action {
        margin-top: 2px;
        opacity: 0;
        transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
      }

      .project-file-browser .project-file-card:hover .project-file-action {
        opacity: 1;
      }

      .project-file-browser .project-file-action:hover {
        background: var(--bg-hover-strong) !important;
        color: var(--text-primary) !important;
      }

      @media (max-width: 760px) {
        .project-browser-grid {
          grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          column-gap: 18px;
          row-gap: 26px;
        }

        .project-browser-list-head,
        .project-browser-row {
          grid-template-columns: minmax(0, 1fr) 78px !important;
        }

        .project-browser-list-head span:nth-child(2),
        .project-browser-list-head span:nth-child(3),
        .project-browser-row-muted {
          display: none;
        }
      }
    `}</style>
  );
}

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
        <span />
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
      <>
        <ProjectFileBrowserStyles />
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
      </>
    );
  }

  if (error) {
    return (
      <>
        <ProjectFileBrowserStyles />
        <div className="project-empty">
          <h2>Couldn&apos;t load project folders</h2>
          <p>{error}</p>
        </div>
      </>
    );
  }

  const activeFolder = activeFolderId == null ? null : foldersById.get(activeFolderId);
  const unassignedAssetCount = assets.filter((asset) => asset.folder_id == null).length;
  const itemCount = visibleFolders.length + visibleSongs.length;

  return (
    <>
      <ProjectFileBrowserStyles />
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
    </>
  );
}
