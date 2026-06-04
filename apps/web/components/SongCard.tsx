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
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import IconButton from "@/components/IconButton";
import { getRecord } from "@/lib/utils";

type StemItem = {
  name: string;
  url: string;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getStemNameFromUrl(url: string, index: number) {
  const decodedUrl = decodeURIComponent(url);
  const filename =
    decodedUrl
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "") || "";

  if (filename) {
    return filename
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return `Stem ${index + 1}`;
}

function normalizeStems(value: unknown): StemItem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return normalizeStems(JSON.parse(value));
    } catch {
      return value
        .split(/\n/)
        .map((url, index) => {
          const cleanUrl = url.trim();
          if (!cleanUrl || !cleanUrl.startsWith("http")) return null;
          return { name: getStemNameFromUrl(cleanUrl, index), url: cleanUrl };
        })
        .filter((item): item is StemItem => Boolean(item));
    }
  }

  if (!Array.isArray(value)) return [];

  if (value.every((item) => typeof item === "string")) {
    const joined = value.join("\n").trim();
    if (joined.startsWith("[") || joined.startsWith("{")) {
      try {
        return normalizeStems(JSON.parse(joined));
      } catch {
        /* fall through */
      }
    }
  }

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url || !url.startsWith("http")) return null;
        return { name: getStemNameFromUrl(url, index), url };
      }

      if (!item || typeof item !== "object") return null;

      const record = getRecord(item);
      const url =
        typeof record.url === "string" && record.url.trim()
          ? record.url.trim()
          : typeof record.href === "string" && record.href.trim()
            ? record.href.trim()
            : "";

      if (!url) return null;

      const name =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : getStemNameFromUrl(url, index);

      return { name, url };
    })
    .filter((item): item is StemItem => Boolean(item));
}

function getSongStems(song: Song) {
  const record = getRecord(song);
  const fields =
    typeof record.fields === "object" && record.fields !== null
      ? getRecord(record.fields)
      : null;

  return (
    [
      normalizeStems(record.stems),
      normalizeStems(record.Stems),
      normalizeStems(record["Stem Files"]),
      normalizeStems(record.stemUrls),
      normalizeStems(record.stem_urls),
      fields ? normalizeStems(fields.stems) : [],
      fields ? normalizeStems(fields.Stems) : [],
      fields ? normalizeStems(fields["Stem Files"]) : [],
      fields ? normalizeStems(fields.stemUrls) : [],
      fields ? normalizeStems(fields.stem_urls) : [],
    ].find((items) => items.length > 0) ?? []
  );
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
  const cardRef = useRef<HTMLArticleElement | null>(null);

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
            <Image src={coverArtUrl} alt={song.title} fill sizes="40px" className="object-cover" />
          ) : (
            <div className="h-10 w-10 bg-[var(--bg-hover)]" />
          )
        }
        playOverlay={displayIcon}
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
