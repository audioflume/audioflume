"use client";

import { useMemo } from "react";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import type { ProjectAsset, ProjectFolder, Song } from "@/lib/types";
import ProjectFolderCard from "./project-browser/ProjectFolderCard";
import ProjectSongFileCard from "./project-browser/ProjectSongFileCard";
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
  const nextViewMode: ProjectFileView = viewMode === "grid" ? "list" : "grid";

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
            <button
              type="button"
              onClick={() => onOpenFolder(null)}
              className={breadcrumbFolders.length === 0 ? "is-current" : ""}
            >
              All Files
            </button>
            {breadcrumbFolders.map((folder, index) => {
              const isCurrent = index === breadcrumbFolders.length - 1;

              return (
                <span key={folder.id}>
                  <span className="project-path-separator">/</span>
                  <button
                    type="button"
                    onClick={() => onOpenFolder(folder.id)}
                    className={isCurrent ? "is-current" : ""}
                  >
                    {folder.name}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
        <div className="project-file-browser-actions">
          <button
            type="button"
            className="project-view-toggle-button"
            aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
            title={viewMode === "grid" ? "List view" : "Grid view"}
            onClick={() => onViewModeChange(nextViewMode)}
          >
            {viewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
          </button>
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
                <ProjectFolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />
              ))}
              {visibleSongs.map((song) => (
                <ProjectSongFileCard key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} onMove={onMoveSong} />
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
                <ProjectFolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />
              ))}
              {visibleSongs.map((song) => (
                <ProjectSongFileCard key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} onMove={onMoveSong} />
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
