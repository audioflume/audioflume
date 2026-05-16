"use client";

import type { Song } from "@/lib/types";
import { useState } from "react";
import DropdownShell from "@/components/DropdownShell";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import AddToProjectModal from "@/components/AddToProjectModal";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import HeartIcon from "@/components/icons/HeartIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import Waveform from "@/components/Waveform";
import {
  iconButtonActiveClass,
  smallIconButtonClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 5H10V19H7V5Z" />
      <path d="M14 5H17V19H14V5Z" />
    </svg>
  );
}

type SongRowProps = {
  song?: Song | null;
  isLast?: boolean;
  playlistId?: string;
  projectId?: string;
  showWaveform?: boolean;
  onRemoveFromPlaylist?: (songId: string) => void;
  onRemoveFromProject?: (songId: string) => void;
};

export default function SongRow({
  song,
  isLast = false,
  playlistId,
  projectId,
  showWaveform = false,
  onRemoveFromPlaylist,
  onRemoveFromProject,
}: SongRowProps) {
  const { currentSong, isPlaying, togglePlayPause, seekTo } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { playlists, setPlaylists } = usePlaylists();

  const [moreOpen, setMoreOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistCoverPreview, setNewPlaylistCoverPreview] = useState<
    string | null
  >(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  if (!song?.id) return null;

  const safeSong = song;

  const playerVisible = !!currentSong;
  const isCurrentSong = currentSong?.id === safeSong.id;
  const rowIsPlaying = isCurrentSong && isPlaying;
  const favorited = isFavorite(safeSong.id);
  const visibleGenres = Array.isArray(safeSong.genres)
    ? safeSong.genres.slice(0, 3)
    : [];

  function handlePlayClick() {
    if (!safeSong.audioUrl) return;

    if (isCurrentSong) {
      togglePlayPause(safeSong);
      return;
    }

    seekTo(safeSong, 0, currentSong ? isPlaying : true);
  }

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim() || isCreatingPlaylist) return;

    setIsCreatingPlaylist(true);

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPlaylistName,
          cover_image_url: newPlaylistCoverPreview,
          position: playlists.length,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Failed to create playlist:", data || res.statusText);
        return;
      }

      if (data) {
        setPlaylists((current) => [...current, data]);
      }

      setNewPlaylistName("");
      setNewPlaylistCoverPreview(null);
      setCreatePlaylistOpen(false);
    } finally {
      setIsCreatingPlaylist(false);
    }
  }

  async function handleRemoveFromPlaylist() {
    if (!playlistId || !onRemoveFromPlaylist) return;

    const res = await fetch(
      `/api/playlists/${encodeURIComponent(
        playlistId,
      )}/songs/${encodeURIComponent(safeSong.id)}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) {
      console.error("Failed to remove song from playlist");
      return;
    }

    onRemoveFromPlaylist(safeSong.id);
    setMoreOpen(false);
  }

  async function handleRemoveFromProject() {
    if (!projectId || !onRemoveFromProject) return;

    const res = await fetch(
      `/api/songs/${encodeURIComponent(safeSong.id)}/projects`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: Number(projectId),
          selected: false,
        }),
      },
    );

    if (!res.ok) {
      console.error("Failed to remove song from project");
      return;
    }

    onRemoveFromProject(safeSong.id);
    setMoreOpen(false);
  }

  return (
    <>
      <div
        className={`song-row-compact group/song-row relative grid min-h-[46px] cursor-pointer ${
          showWaveform
            ? "grid-cols-[48px_minmax(180px,240px)_minmax(150px,210px)_minmax(250px,1fr)_minmax(150px,190px)_64px_76px_92px]"
            : "grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(112px,140px)_64px_76px_92px]"
        } items-center gap-3 px-6 text-xs ${
          isLast ? "is-last" : ""
        } ${isCurrentSong ? "bg-[var(--bg-hover)]" : ""}`}
        onClick={handlePlayClick}
      >
        <div className="flex items-center">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handlePlayClick();
            }}
            disabled={!safeSong.audioUrl}
            className="relative h-8 w-8 cursor-pointer overflow-hidden rounded bg-[var(--bg-tertiary)] disabled:cursor-default"
            aria-label={rowIsPlaying ? "Pause song" : "Play song"}
          >
            {safeSong.coverArt && (
              <img
                src={safeSong.coverArt}
                alt={safeSong.title}
                className="h-full w-full object-cover"
              />
            )}

            <span
              className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] text-[var(--media-overlay-contrast)] transition ${
                isCurrentSong
                  ? "opacity-100"
                  : "opacity-0 group-hover/song-row:opacity-100"
              }`}
            >
              {rowIsPlaying ? <PauseIcon /> : <PlayIcon />}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handlePlayClick();
          }}
          disabled={!safeSong.audioUrl}
          className="min-w-0 cursor-pointer text-left disabled:cursor-default"
        >
          <div
            title={safeSong.title}
            className="truncate font-medium leading-tight text-[var(--text-primary)]"
          >
            {safeSong.title}
          </div>
        </button>

        <div
          title={safeSong.artist}
          className="min-w-0 truncate text-[var(--text-subtle)]"
        >
          {safeSong.artist}
        </div>

        {showWaveform && (
          <div
            className="min-w-0 pr-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-[14px] overflow-hidden">
              <Waveform song={safeSong} compact />
            </div>
          </div>
        )}

        <div
          title={visibleGenres.join(", ")}
          className="truncate pl-2 text-[var(--text-secondary)]"
        >
          {visibleGenres.length > 0 ? visibleGenres.join(", ") : "—"}
        </div>

        <div className="text-left text-[var(--text-secondary)]">
          {safeSong.key || "—"}
        </div>

        <div className="text-left text-[var(--text-secondary)]">
          {safeSong.bpm ? `${safeSong.bpm} BPM` : "—"}
        </div>

        <div
          className="flex items-center justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => toggleFavorite(safeSong)}
            className={`${smallIconButtonClass} h-7 w-7 flex-shrink-0 ${
              favorited ? "text-[var(--text-primary)]" : ""
            }`}
            aria-label={
              favorited ? "Remove song from favorites" : "Favorite song"
            }
          >
            <HeartIcon filled={favorited} />
          </button>

          <DropdownShell
            open={moreOpen}
            onOpenChange={setMoreOpen}
            placement="bottom-end"
            className="song-more-dropdown"
            offsetAmount={6}
            flippedOffsetAmount={6}
            collisionPadding={{
              top: 116,
              right: 16,
              bottom: playerVisible ? 85 : 13,
              left: 16,
            }}
            trigger={({ open }) => (
              <button
                type="button"
                className={`${smallIconButtonClass} h-7 w-7 flex-shrink-0 ${
                  open ? iconButtonActiveClass : ""
                }`}
                aria-label="Song options"
                aria-expanded={open}
              >
                <MoreIcon />
              </button>
            )}
          >
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setPlaylistModalOpen(true);
              }}
            >
              Add to Playlist
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setProjectModalOpen(true);
              }}
            >
              Add to Project
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setCreatePlaylistOpen(true);
              }}
            >
              Create New Playlist
            </button>

            <button type="button" disabled>
              Share Song
            </button>

            <button type="button" disabled>
              Download Song
            </button>

            {playlistId && onRemoveFromPlaylist && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setMoreOpen(false);
                  handleRemoveFromPlaylist();
                }}
              >
                Remove from Playlist
              </button>
            )}

            {projectId && onRemoveFromProject && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setMoreOpen(false);
                  handleRemoveFromProject();
                }}
              >
                Remove from Project
              </button>
            )}
          </DropdownShell>

          {safeSong.audioUrl ? (
            <a
              href={safeSong.audioUrl}
              download
              target="_blank"
              rel="noreferrer"
              className={`${smallIconButtonClass} h-7 w-7 flex-shrink-0`}
              aria-label="Download song"
            >
              <DownloadIcon />
            </a>
          ) : (
            <button
              type="button"
              className={`${smallIconButtonClass} h-7 w-7 flex-shrink-0`}
              aria-label="Download unavailable"
              disabled
            >
              <DownloadIcon />
            </button>
          )}
        </div>
      </div>

      <AddToPlaylistModal
        isOpen={playlistModalOpen}
        song={safeSong}
        onClose={() => setPlaylistModalOpen(false)}
      />

      <AddToProjectModal
        isOpen={projectModalOpen}
        song={safeSong}
        onClose={() => setProjectModalOpen(false)}
      />

      <CreatePlaylistModal
        isOpen={createPlaylistOpen}
        name={newPlaylistName}
        coverPreview={newPlaylistCoverPreview}
        isCreating={isCreatingPlaylist}
        onNameChange={setNewPlaylistName}
        onCoverPreviewChange={setNewPlaylistCoverPreview}
        onCreate={handleCreatePlaylist}
        onClose={() => {
          if (isCreatingPlaylist) return;

          setNewPlaylistName("");
          setNewPlaylistCoverPreview(null);
          setCreatePlaylistOpen(false);
        }}
      />
    </>
  );
}
