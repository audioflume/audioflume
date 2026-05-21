"use client";

import { useEffect, useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
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
      .project-download-wrap{display:flex;margin-left:auto;align-items:center;gap:8px}.project-download-trigger::after{display:none!important}.project-google-drive-trigger{display:flex;height:48px;cursor:not-allowed;align-items:center;border-bottom:2px solid transparent;padding:0 2.5px;font-size:13px;font-weight:500;color:var(--text-secondary);opacity:.72}.project-file-browser{padding:0 32px 32px!important}.project-file-browser-top{position:sticky!important;top:105px!important;z-index:70!important;min-height:46px!important;margin-left:-32px;margin-right:-32px;padding:0 32px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;border-bottom:1px solid var(--border)!important;background:var(--bg-primary)!important}.project-file-browser-title-wrap{min-width:0}.project-file-browser-actions{display:flex!important;flex-shrink:0;align-items:center!important;gap:8px!important}.project-breadcrumbs.project-path{margin-top:0!important;display:flex;align-items:center;gap:6px!important;font-size:12px!important;line-height:1;text-transform:lowercase}.project-breadcrumbs.project-path span{display:inline-flex;align-items:center;gap:6px!important}.project-breadcrumbs.project-path button,.project-breadcrumbs.project-path span{color:var(--text-secondary)}.project-breadcrumbs.project-path button:hover{color:var(--text-primary)}.project-file-browser-section{padding-top:24px!important}.project-browser-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));column-gap:24px;row-gap:34px;align-items:start}
      .project-file-browser .project-folder-card,.project-file-browser .project-file-card{min-height:0!important;height:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;border:0!important;border-radius:8px!important;background:transparent!important;padding:6px 5px!important;text-align:center!important;transform:none!important}.project-file-browser .project-folder-card{gap:11px!important}.project-file-browser .project-file-card{position:relative;gap:10px!important}.project-file-browser .project-folder-card:hover,.project-file-browser .project-file-card:hover,.project-file-browser .project-file-card.is-active{background:var(--bg-hover-strong)!important;transform:none!important}
      .project-folder-glyph{position:relative;display:block;width:62px;height:54px;filter:none}.project-folder-glyph-tab{position:absolute;left:0;top:6px;width:28px;height:12px;border-radius:4px 5px 0 0;background:linear-gradient(180deg,#3b3b3b 0%,#252525 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 1px 0 0 rgba(255,255,255,.06)}.project-folder-glyph-body{position:absolute;left:0;right:0;bottom:0;height:43px;border-radius:5px;background:linear-gradient(180deg,#3a3a3a 0%,#242424 48%,#151515 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 2px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(0,0,0,.72),inset 1px 0 0 rgba(255,255,255,.04),inset -1px 0 0 rgba(0,0,0,.4),0 1px 1px rgba(0,0,0,.42)}.project-folder-glyph-body::before{content:"";position:absolute;left:4px;right:4px;top:4px;height:1px;border-radius:999px;background:rgba(255,255,255,.18)}.project-folder-glyph-body::after{content:"";position:absolute;left:5px;right:5px;bottom:4px;height:1px;border-radius:999px;background:rgba(0,0,0,.55)}.project-folder-glyph.small{width:19px;height:16px}.project-folder-glyph.small .project-folder-glyph-tab{left:0;top:2px;width:9px;height:4px;border-radius:1px 2px 0 0}.project-folder-glyph.small .project-folder-glyph-body{height:13px;border-radius:2px}.project-folder-glyph.small .project-folder-glyph-body::before,.project-folder-glyph.small .project-folder-glyph-body::after{display:none}
      .project-folder-card-name,.project-file-browser .project-file-card-title{max-width:108px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal!important;font-size:11px;font-weight:500;line-height:1.15;letter-spacing:-.01em;color:var(--text-primary)}.project-folder-card-meta{display:none}.project-file-card-icon-wrap{position:relative;display:flex;height:54px;align-items:center;justify-content:center}.project-music-glyph{display:flex;height:44px;width:44px;align-items:center;justify-content:center;border-radius:8px;background:linear-gradient(180deg,var(--bg-tertiary) 0%,var(--bg-secondary) 100%);color:var(--text-secondary);box-shadow:inset 0 0 0 1px var(--border),inset 0 1px 0 rgba(255,255,255,.07);font-size:20px}.project-music-glyph.small{height:22px;width:22px;border-radius:5px;font-size:12px}.project-file-browser .project-file-card-meta{max-width:108px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:-6px!important;font-size:9px;color:var(--text-muted)}
      .project-preview-button{position:absolute;inset:0;margin:auto;display:flex;height:32px;width:32px;cursor:pointer;align-items:center;justify-content:center;border-radius:999px;color:var(--text-primary);opacity:0;transform:scale(.94);transition:opacity .15s ease,transform .15s ease}.project-preview-button::before{content:"";position:absolute;inset:2px;border-radius:inherit;background:var(--bg-primary)}.project-preview-button svg{position:relative;z-index:1}.project-file-card:hover .project-preview-button,.project-preview-button.is-playing,.project-preview-button.is-active{opacity:1;transform:scale(1)}
      .project-browser-list{overflow:hidden;border:1px solid var(--border);border-radius:14px;background:var(--bg-secondary)}.project-browser-list-head,.project-browser-row{display:grid!important;grid-template-columns:minmax(220px,1fr) minmax(140px,220px) 120px 42px!important;align-items:center!important;gap:14px!important}.project-browser-list-head{min-height:34px;padding:0 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)}.project-browser-row{width:100%;min-height:34px!important;border:0!important;border-bottom:1px solid var(--border-subtle)!important;border-radius:0!important;background:transparent!important;padding:0 14px!important;text-align:left;transition:background .15s ease}.project-browser-row:last-child{border-bottom:0!important}.project-browser-row:hover{background:var(--bg-hover-strong)!important}.project-browser-row-name{display:flex;min-width:0;align-items:center;gap:8px}.project-browser-row-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:500;color:var(--text-primary)}.project-browser-row-muted{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text-secondary)}
      .project-file-browser .project-file-action{display:flex;height:18px!important;width:18px;cursor:pointer;align-items:center;justify-content:center;border:0!important;border-radius:0!important;background:transparent!important;padding:0!important;font-size:13px!important;line-height:1;color:var(--text-secondary)!important}.project-file-browser .project-file-card .project-file-action{position:absolute;right:7px;top:7px;opacity:0;transition:opacity .15s ease,color .15s ease}.project-file-browser .project-file-card:hover .project-file-action,.project-file-browser .project-file-card.is-active .project-file-action{opacity:1}.project-file-browser .project-file-action:hover{background:transparent!important;color:var(--text-primary)!important}.project-new-folder-button{display:flex;height:28px;width:28px;cursor:pointer;align-items:center;justify-content:center;border-radius:7px;color:var(--text-secondary);transition:background .15s ease,color .15s ease}.project-new-folder-button:hover{background:var(--bg-hover-strong);color:var(--text-primary)}
      @media(max-width:760px){.project-file-browser{padding-left:18px!important;padding-right:18px!important}.project-file-browser-top{top:105px!important;margin-left:-18px;margin-right:-18px;padding-left:18px!important;padding-right:18px!important}.project-browser-grid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));column-gap:18px;row-gap:26px}.project-browser-list-head,.project-browser-row{grid-template-columns:minmax(0,1fr) 42px!important}.project-browser-list-head span:nth-child(2),.project-browser-list-head span:nth-child(3),.project-browser-row-muted{display:none}}
    `}</style>
  );
}

function FolderGlyph({ small = false }: { small?: boolean }) {
  return <span className={small ? "project-folder-glyph small" : "project-folder-glyph"}><span className="project-folder-glyph-tab" /><span className="project-folder-glyph-body" /></span>;
}

function MusicGlyph({ small = false }: { small?: boolean }) {
  return <span className={small ? "project-music-glyph small" : "project-music-glyph"}>♪</span>;
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
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

function FolderCard({ folder, viewMode, onOpen }: { folder: ProjectFolder; viewMode: ProjectFileView; onOpen: (folderId: number) => void }) {
  const totalItems = (folder.child_count ?? 0) + (folder.asset_count ?? 0);

  if (viewMode === "list") {
    return (
      <button type="button" className="project-browser-row project-folder-row" onClick={() => onOpen(folder.id)}>
        <span className="project-browser-row-name"><FolderGlyph small /><span className="project-browser-row-title">{folder.name}</span></span>
        <span className="project-browser-row-muted">{totalItems || "--"}</span>
        <span className="project-browser-row-muted">{getAssetTypeLabel(folder.asset_type)}</span>
        <span />
      </button>
    );
  }

  return <button type="button" className="project-folder-card" onClick={() => onOpen(folder.id)}><FolderGlyph /><span className="project-folder-card-name">{folder.name}</span><span className="project-folder-card-meta">{totalItems} {totalItems === 1 ? "item" : "items"}</span></button>;
}

function SongFileCard({ song, viewMode, onMove }: { song: ProjectSong; viewMode: ProjectFileView; onMove: (song: ProjectSong) => void }) {
  const { currentSong, isPlaying, currentTime, duration, togglePlayPause } = usePlayer();
  const isActive = currentSong?.id === song.id;
  const progress = isActive && duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const progressDegrees = `${progress * 360}deg`;
  const previewIsPlaying = isActive && isPlaying;

  if (viewMode === "list") {
    return (
      <div className="project-browser-row project-file-row">
        <span className="project-browser-row-name"><button type="button" className={`project-preview-button is-active ${previewIsPlaying ? "is-playing" : ""}`} style={{ background: `conic-gradient(var(--text-primary) ${progressDegrees}, rgba(255,255,255,0.18) 0deg)` }} onClick={() => togglePlayPause(song)} aria-label={previewIsPlaying ? `Pause ${song.title}` : `Preview ${song.title}`}><PlayPauseIcon playing={previewIsPlaying} /></button><MusicGlyph small /><span className="project-browser-row-title">{song.title}</span></span>
        <span className="project-browser-row-muted">{song.artist || "--"}</span><span className="project-browser-row-muted">Music</span><button type="button" className="project-file-action" onClick={() => onMove(song)} aria-label={`Move ${song.title}`}>⋯</button>
      </div>
    );
  }

  return (
    <div className={`project-file-card ${isActive ? "is-active" : ""}`}>
      <button type="button" className="project-file-action" onClick={() => onMove(song)} aria-label={`Move ${song.title}`}>⋯</button>
      <div className="project-file-card-icon-wrap"><MusicGlyph /><button type="button" className={`project-preview-button ${previewIsPlaying ? "is-playing" : ""} ${isActive ? "is-active" : ""}`} style={{ background: `conic-gradient(var(--text-primary) ${progressDegrees}, rgba(255,255,255,0.18) 0deg)` }} onClick={() => togglePlayPause(song)} aria-label={previewIsPlaying ? `Pause ${song.title}` : `Preview ${song.title}`}><PlayPauseIcon playing={previewIsPlaying} /></button></div>
      <div className="project-file-card-title">{song.title}</div><div className="project-file-card-meta">{formatSongMeta(song)}</div>
    </div>
  );
}

export default function ProjectFileBrowser({ folders, assets: _assets, songs, loading, error, activeFolderId, viewMode, onViewModeChange, onOpenFolder, onMoveSong, onCreateFolder }: ProjectFileBrowserProps) {
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
    return <><ProjectFileBrowserStyles /><div className="project-file-browser"><div className="project-file-browser-top"><div className="project-detail-skeleton-meta-line short project-skeleton-block" /><div className="project-tab-skeleton project-skeleton-block" /></div><div className="project-browser-grid">{Array.from({ length: 8 }, (_, index) => <div key={index} className="project-folder-card skeleton-card"><div className="project-skeleton-block h-[58px] w-[82px] rounded-[10px]" /><div className="project-detail-skeleton-meta-line short project-skeleton-block" /></div>)}</div></div></>;
  }

  if (error) {
    return <><ProjectFileBrowserStyles /><div className="project-empty"><h2>Couldn&apos;t load project folders</h2><p>{error}</p></div></>;
  }

  return (
    <>
      <ProjectFileBrowserStyles />
      <div className="project-file-browser">
        <div className="project-file-browser-top">
          <div className="project-file-browser-title-wrap"><div className="project-breadcrumbs project-path"><button type="button" onClick={() => onOpenFolder(null)}>All Files</button>{breadcrumbFolders.map((folder) => <span key={folder.id}><span>/</span><button type="button" onClick={() => onOpenFolder(folder.id)}>{folder.name}</button></span>)}</div></div>
          <div className="project-file-browser-actions"><div className="project-view-toggle"><button type="button" onClick={() => onViewModeChange("grid")} className={viewMode === "grid" ? "is-active" : ""}>Grid</button><button type="button" onClick={() => onViewModeChange("list")} className={viewMode === "list" ? "is-active" : ""}>List</button></div><button type="button" className="project-new-folder-button" onClick={onCreateFolder} aria-label="New folder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg></button></div>
        </div>
        <div className="project-file-browser-section">
          <div className="project-file-section-heading"><span>{viewMode === "grid" ? "Items" : "Name"}</span><span>{itemCount} items</span></div>
          {itemCount > 0 ? (viewMode === "grid" ? <div className="project-browser-grid">{visibleFolders.map((folder) => <FolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />)}{visibleSongs.map((song) => <SongFileCard key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} onMove={onMoveSong} />)}</div> : <div className="project-browser-list"><div className="project-browser-list-head"><span>Name</span><span>Info</span><span>Kind</span><span /></div>{visibleFolders.map((folder) => <FolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />)}{visibleSongs.map((song) => <SongFileCard key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} onMove={onMoveSong} />)}</div>) : <div className="project-file-empty-inline">No files in this folder yet.</div>}
        </div>
      </div>
    </>
  );
}
