"use client";

import { useEffect, useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { ProjectAsset, ProjectFolder, Song } from "@/lib/types";
import "./project-browser/ProjectFileBrowser.module.css";

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

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
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

function getGoogleDriveButtonMarkup() {
  return `<span>Add to Drive</span>`;
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

function SongFileCard({
  song,
  viewMode,
  onMove,
}: {
  song: ProjectSong;
  viewMode: ProjectFileView;
  onMove: (song: ProjectSong) => void;
}) {
  const { currentSong, isPlaying, currentTime, duration, togglePlayPause } = usePlayer();
  const isActive = currentSong?.id === song.id;
  const progress = isActive && duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const progressDegrees = `${progress * 360}deg`;
  const previewIsPlaying = isActive && isPlaying;

  if (viewMode === "list") {
    return (
      <div className="project-browser-row project-file-row">
        <span className="project-browser-row-name">
          <button
            type="button"
            className={`project-preview-button is-active ${previewIsPlaying ? "is-playing" : ""}`}
            style={{ background: `conic-gradient(var(--text-primary) ${progressDegrees}, var(--project-preview-track) 0deg)` }}
            onClick={() => togglePlayPause(song)}
            aria-label={previewIsPlaying ? `Pause ${song.title}` : `Preview ${song.title}`}
          >
            <PlayPauseIcon playing={previewIsPlaying} />
          </button>
          <MusicGlyph small />
          <span className="project-browser-row-title">{song.title}</span>
        </span>
        <span className="project-browser-row-muted">{song.artist || "--"}</span>
        <span className="project-browser-row-muted">Music</span>
        <button type="button" className="project-file-action" onClick={() => onMove(song)} aria-label={`Move ${song.title}`}>
          ⋯
        </button>
      </div>
    );
  }

  return (
    <div className={`project-file-card ${isActive ? "is-active" : ""}`}>
      <button type="button" className="project-file-action" onClick={() => onMove(song)} aria-label={`Move ${song.title}`}>
        ⋯
      </button>
      <div className="project-file-card-icon-wrap">
        <MusicGlyph />
        <button
          type="button"
          className={`project-preview-button ${previewIsPlaying ? "is-playing" : ""} ${isActive ? "is-active" : ""}`}
          style={{ background: `conic-gradient(var(--text-primary) ${progressDegrees}, var(--project-preview-track) 0deg)` }}
          onClick={() => togglePlayPause(song)}
          aria-label={previewIsPlaying ? `Pause ${song.title}` : `Preview ${song.title}`}
        >
          <PlayPauseIcon playing={previewIsPlaying} />
        </button>
      </div>
      <div className="project-file-card-title">{song.title}</div>
      <div className="project-file-card-meta">{formatSongMeta(song)}</div>
    </div>
  );
}

export default function ProjectFileBrowser({
  folders,
  assets: _assets,
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
  const foldersById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);

  useEffect(() => {
    const wrap = document.querySelector(".project-download-wrap");
    if (!wrap || document.querySelector(".project-google-drive-trigger")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.disabled = true;
    button.className = "project-google-drive-trigger";
    button.title = "Google Drive export requires a Google Drive integration.";
    button.innerHTML = getGoogleDriveButtonMarkup();
    wrap.insertBefore(button, wrap.firstChild);

    return () => button.remove();
  }, []);

  const breadcrumbFolders = useMemo(() => {
    if (activeFolderId == null) return [];
    const chain: ProjectFolder[] = [];
    const visited = new Set<number>();
    let current = foldersById.get(activeFolderId) ?? null;
    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current = current.parent_folder_id == null ? null : foldersById.get(current.parent_folder_id) ?? null;
    }
    return chain;
  }, [activeFolderId, foldersById]);

  const visibleFolders = useMemo(() => folders.filter((folder) => folder.parent_folder_id === activeFolderId), [folders, activeFolderId]);
  const visibleSongs = useMemo(() => songs.filter((song) => (song.project_folder_id ?? null) === activeFolderId), [songs, activeFolderId]);
  const itemCount = visibleFolders.length + visibleSongs.length;

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

  return (
    <div className="project-file-browser">
      <div className="project-file-browser-top">
        <div className="project-file-browser-title-wrap">
          <div className="project-breadcrumbs project-path">
            <button type="button" onClick={() => onOpenFolder(null)}>
              All Files
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
            <button type="button" onClick={() => onViewModeChange("grid")} className={viewMode === "grid" ? "is-active" : ""}>
              Grid
            </button>
            <button type="button" onClick={() => onViewModeChange("list")} className={viewMode === "list" ? "is-active" : ""}>
              List
            </button>
          </div>
          <button type="button" className="project-new-folder-button" onClick={onCreateFolder} aria-label="New folder" title="New folder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
      <div className="project-file-browser-section">
        <div className="project-file-section-heading">
          <span>Items</span>
          <span>{itemCount} items</span>
        </div>
        {itemCount > 0 ? (
          viewMode === "grid" ? (
            <div className="project-browser-grid">
              {visibleFolders.map((folder) => (
                <FolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />
              ))}
              {visibleSongs.map((song) => (
                <SongFileCard key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} onMove={onMoveSong} />
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
                <FolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />
              ))}
              {visibleSongs.map((song) => (
                <SongFileCard key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} onMove={onMoveSong} />
              ))}
            </div>
          )
        ) : (
          <div className="project-file-empty-inline">No files in this folder yet.</div>
        )}
      </div>
    </div>
  );
}
