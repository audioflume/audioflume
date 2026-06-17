"use client";

import type { MouseEvent } from "react";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
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

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return "—";

  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
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
  const { currentSong, isPlaying, togglePlayPause, setQueue } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();
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
          <span className="project-browser-row-icon project-file-list-icon-wrap">
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
          <span className="project-browser-row-title-wrap">
            <span className="project-browser-row-title">{song.title}</span>
            <span className="project-browser-row-subtitle">{song.artist || "Unknown Artist"}</span>
          </span>
        </span>
        <span className="project-browser-row-size">{formatDuration(song.duration)}</span>
        <span className="project-browser-row-date">{formatRelativeDate(song.project_added_at)}</span>
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
