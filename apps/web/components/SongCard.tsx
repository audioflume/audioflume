"use client";

import { useEffect, useRef, useState } from "react";
import {
  usePlayer,
  useIsCurrentSong,
  useIsCurrentSongPlaying,
  useHasCurrentSong,
} from "@/context/PlayerContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import {
  getSongStemsFromRecord,
  SongCardShell,
  SongCardStemsSlot,
} from "@filmwave/shared";
import Waveform from "./Waveform";
import Image from "next/image";
import type { Song } from "@/lib/types";
import SongMoreDropdown from "@/components/SongMoreDropdown";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import AddToProjectModal from "@/components/AddToProjectModal";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import HeartIcon from "@/components/icons/HeartIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import NoVocalsIcon from "@/components/icons/NoVocalsIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import IconButton from "@/components/IconButton";

function AiGeneratedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.4 3.8L9.7 7.1L13 8.4L9.7 9.7L8.4 13L7.1 9.7L3.8 8.4L7.1 7.1L8.4 3.8Z" fill="currentColor" />
      <path d="M15.6 10.8L16.7 13.3L19.2 14.4L16.7 15.5L15.6 18L14.5 15.5L12 14.4L14.5 13.3L15.6 10.8Z" fill="currentColor" />
    </svg>
  );
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isNoVocalsLabel(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  return (
    normalized.includes("instrumental") ||
    normalized.includes("no vocals") ||
    normalized.includes("no vocal") ||
    normalized.includes("no voice")
  );
}

function isInstrumentalSong(song: Song) {
  if (song.instrumental) return true;

  return song.vocals.some(isNoVocalsLabel);
}

export default function SongCard({
  song,
  playlistId,
  projectId,
  highlightedEditPointTypes = [],
  showEditPointMarkers: showEditPointMarkersProp,
  onRemoveFromPlaylist,
  onRemoveFromProject,
}: {
  song: Song;
  isFirst?: boolean;
  isLast?: boolean;
  playlistId?: string;
  projectId?: string;
  highlightedEditPointTypes?: string[];
  showEditPointMarkers?: boolean;
  onRemoveFromPlaylist?: (songId: string) => void;
  onRemoveFromProject?: (songId: string) => void;
}) {
  const isCurrentSong = useIsCurrentSong(song.id);
  const actuallyPlaying = useIsCurrentSongPlaying(song.id);
  const playerVisible = useHasCurrentSong();
  const { togglePlayPause } = usePlayer();

  const { isFavorite, toggleFavorite } = useFavorites();
  const { showEditPointMarkers: userPreferenceShowEditPointMarkers } = useUserPreferences();
  const showEditPointMarkers = showEditPointMarkersProp ?? userPreferenceShowEditPointMarkers;
  const { playlists, setPlaylists } = usePlaylists();

  const [cardWidth, setCardWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [stemsOpen, setStemsOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistCoverPreview, setNewPlaylistCoverPreview] = useState<string | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const displayIcon = actuallyPlaying ? (
    <PauseIcon size={15} />
  ) : (
    <PlayIconSmall size={15} />
  );
  const visibleGenres = song.genres.slice(0, 3);
  const showGenreSlot = cardWidth > 1080;
  const showKeyMeta = cardWidth > 700;
  const showBpmMeta = cardWidth > 820;
  const stems = getSongStemsFromRecord(song);
  const favorited = isFavorite(song.id);
  const durationLabel = formatDuration(song.duration);
  const showNoVocalsIcon = isInstrumentalSong(song);

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim() || isCreatingPlaylist) return;
    setIsCreatingPlaylist(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (data) setPlaylists((current) => [...current, data]);
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
      `/api/playlists/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(song.id)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      console.error("Failed to remove song from playlist");
      return;
    }
    onRemoveFromPlaylist(song.id);
    setMoreOpen(false);
  }

  async function handleRemoveFromProject() {
    if (!projectId || !onRemoveFromProject) return;
    const res = await fetch(`/api/songs/${encodeURIComponent(song.id)}/projects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: Number(projectId), selected: false }),
    });
    if (!res.ok) {
      console.error("Failed to remove song from project");
      return;
    }
    onRemoveFromProject(song.id);
    setMoreOpen(false);
  }

  async function handleDownloadSong() {
    try {
      const res = await fetch(`/api/songs/${encodeURIComponent(song.id)}/download`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data?.downloadUrl) {
        console.error("Failed to prepare song download", data);
        return;
      }

      window.open(String(data.downloadUrl), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to download song", error);
    }
  }

  const coverArtUrl =
    typeof song.coverArt === "string" && song.coverArt.trim()
      ? song.coverArt
      : null;

  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setCardWidth(entries[0].contentRect.width);
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <SongCardShell
        cardRef={cardRef}
        dataSongCardId={song.id}
        className={`group w-full scroll-mt-48 scroll-mb-40 cursor-pointer transition-colors${
          isCurrentSong ? " is-current" : ""
        }`}
        coverLabel={actuallyPlaying ? "Pause song" : "Play song"}
        onCoverClick={() => togglePlayPause(song)}
        cover={
          coverArtUrl ? (
            <Image src={coverArtUrl} alt={song.title} fill sizes="62px" className="object-cover" />
          ) : (
            <div className="h-[62px] w-[62px] bg-[var(--bg-hover)]" />
          )
        }
        coverBadge={
          song.aiGenerated ? (
            <span className="filmwave-song-ai-badge" aria-label="Made with AI">
              <AiGeneratedIcon />
            </span>
          ) : null
        }
        playOverlay={displayIcon}
        vocalIndicator={
          showNoVocalsIcon ? (
            <NoVocalsIcon className="filmwave-song-no-vocals-icon" />
          ) : null
        }
        title={song.title}
        artist={song.artist}
        stems={
          <SongCardStemsSlot
            stems={stems}
            open={stemsOpen}
            onOpenChange={setStemsOpen}
          />
        }
        waveform={
          <Waveform
            song={song}
            highlightedEditPointTypes={highlightedEditPointTypes}
            showEditPointMarkers={showEditPointMarkers}
          />
        }
        duration={durationLabel}
        genre={showGenreSlot ? (visibleGenres.length > 0 ? visibleGenres.join(", ") : "") : null}
        keyMeta={showKeyMeta ? song.key || "—" : null}
        bpmMeta={showBpmMeta ? (song.bpm ? `${song.bpm} BPM` : "—") : null}
        actions={
          <>
            <IconButton
              label={favorited ? "Remove song from favorites" : "Favorite song"}
              active={favorited}
              onClick={() => toggleFavorite(song)}
            >
              <HeartIcon filled={favorited} />
            </IconButton>

            <SongMoreDropdown
              open={moreOpen}
              onOpenChange={setMoreOpen}
              onAddToPlaylist={() => setPlaylistModalOpen(true)}
              onAddToProject={() => setProjectModalOpen(true)}
              onCreatePlaylist={() => setCreatePlaylistOpen(true)}
              onRemoveFromPlaylist={playlistId ? handleRemoveFromPlaylist : undefined}
              onRemoveFromProject={projectId ? handleRemoveFromProject : undefined}
              collisionPadding={{
                top: 163,
                right: 16,
                bottom: playerVisible ? 85 : 13,
                left: 16,
              }}
            />

            <IconButton label="Download song" onClick={handleDownloadSong}>
              <DownloadIcon />
            </IconButton>
          </>
        }
      />

      {playlistModalOpen && (
        <AddToPlaylistModal
          isOpen={playlistModalOpen}
          song={song}
          onClose={() => setPlaylistModalOpen(false)}
        />
      )}

      {projectModalOpen && (
        <AddToProjectModal
          isOpen={projectModalOpen}
          song={song}
          onClose={() => setProjectModalOpen(false)}
        />
      )}

      {createPlaylistOpen && (
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
      )}
    </>
  );
}
