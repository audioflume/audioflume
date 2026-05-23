"use client";

import type { MouseEvent } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import { MusicGlyph, PlayPauseIcon } from "./ProjectBrowserGlyphs";

type ProjectFileView = "grid" | "list";

type ProjectSong = Song & {
  project_asset_id?: number;
  project_id?: number;
  project_position?: number;
  project_added_at?: string;
  project_notes?: string | null;
  project_folder_id?: number | null;
};

export default function ProjectSongFileCard({
  song,
  viewMode,
  queueSongs,
  onContextMenu,
}: {
  song: ProjectSong;
  viewMode: ProjectFileView;
  queueSongs: ProjectSong[];
  onContextMenu?: (event: MouseEvent<HTMLElement>, song: ProjectSong) => void;
}) {
  const { currentSong, isPlaying, currentTime, duration, togglePlayPause, setQueue } = usePlayer();
  const isActive = currentSong?.id === song.id;
  const progress = isActive && duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const progressDegrees = `${progress * 360}deg`;
  const previewIsPlaying = isActive && isPlaying;

  function handlePreviewClick() {
    setQueue(queueSongs.filter((item) => item.audioUrl));
    togglePlayPause(song);
  }

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    onContextMenu?.(event, song);
  }

  if (viewMode === "list") {
    return (
      <div className="project-browser-row project-file-row" onContextMenu={handleContextMenu}>
        <span className="project-browser-row-name">
          <span className="project-file-list-icon-wrap">
            <MusicGlyph small />
            <button
              type="button"
              className={`project-preview-button project-preview-button-list ${previewIsPlaying ? "is-playing" : ""} ${isActive ? "is-active" : ""}`}
              style={{ background: `conic-gradient(var(--text-primary) ${progressDegrees}, var(--project-preview-track) 0deg)` }}
              onClick={handlePreviewClick}
              aria-label={previewIsPlaying ? `Pause ${song.title}` : `Preview ${song.title}`}
            >
              <PlayPauseIcon playing={previewIsPlaying} />
            </button>
          </span>
          <span className="project-browser-row-title">{song.title}</span>
        </span>
        <span className="project-browser-row-muted">{song.artist || "--"}</span>
        <span className="project-browser-row-muted">Music</span>
        <span />
      </div>
    );
  }

  return (
    <div className={`project-file-card ${isActive ? "is-active" : ""}`} onContextMenu={handleContextMenu}>
      <div className="project-file-card-icon-wrap">
        <MusicGlyph />
        <button
          type="button"
          className={`project-preview-button ${previewIsPlaying ? "is-playing" : ""} ${isActive ? "is-active" : ""}`}
          style={{ background: `conic-gradient(var(--text-primary) ${progressDegrees}, var(--project-preview-track) 0deg)` }}
          onClick={handlePreviewClick}
          aria-label={previewIsPlaying ? `Pause ${song.title}` : `Preview ${song.title}`}
        >
          <PlayPauseIcon playing={previewIsPlaying} />
        </button>
      </div>
      <div className="project-file-card-title">{song.title}</div>
      <div className="project-file-card-meta">{song.artist || "Unknown Artist"}</div>
    </div>
  );
}
