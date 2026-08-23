"use client";

import { useEffect, useMemo, useState } from "react";
import { PremiumLabel } from "@filmwave/shared";

import Waveform from "@/components/Waveform";
import {
  BackendButton,
  BackendCheckbox,
} from "@/components/backend/BackendControls";
import BackendModalShell from "@/components/backend/BackendModalShell";
import { BackendMediaThumbnail, BackendRowTitle } from "@/components/backend/BackendRow";
import BackendSearchBar from "@/components/backend/BackendSearchBar";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

type ReleaseType = "single" | "ep" | "album" | "playlist";

type PickerResponse = {
  songs?: Song[];
  unavailable_song_ids?: string[];
  error?: string;
};

type ArtistReleaseTrackPickerProps = {
  artistId: string;
  releaseType: ReleaseType;
  existingTrackIds: string[];
  disabled?: boolean;
  onAdd: (songIds: string[]) => void;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function ReleasePickerSongRow({
  song,
  selected,
  alreadyAdded,
  onToggle,
}: {
  song: Song;
  selected: boolean;
  alreadyAdded: boolean;
  onToggle: () => void;
}) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const isCurrentSong = currentSong?.id === song.id;
  const actuallyPlaying = isCurrentSong && isPlaying;

  return (
    <div
      className={`grid min-h-[72px] grid-cols-[32px_52px_minmax(180px,1fr)_minmax(220px,1.35fr)_70px_70px_78px] items-center gap-3 border-b border-[var(--border-subtle)] px-5 text-xs font-[320] transition-colors last:border-b-0 hover:bg-[var(--bg-hover)] ${
        alreadyAdded ? "opacity-30" : ""
      }`}
    >
      <BackendCheckbox
        checked={selected}
        onChange={() => onToggle()}
        disabled={alreadyAdded}
        ariaLabel={`Select ${song.title}`}
        className="min-h-0 justify-center"
      />

      <button
        type="button"
        onClick={() => togglePlayPause(song)}
        className="group relative h-[52px] w-[52px] overflow-hidden bg-[var(--bg-tertiary)]"
        style={{ "--filmwave-song-card-play-size": "32px" } as React.CSSProperties}
        aria-label={actuallyPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        <BackendMediaThumbnail
          src={song.coverArt}
          size={52}
          className="h-full w-full"
        />
        <span
          className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] transition-opacity ${
            isCurrentSong ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span className="filmwave-song-play-button">
            {actuallyPlaying ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onToggle}
        disabled={alreadyAdded}
        className="min-w-0 text-left"
      >
        <BackendRowTitle secondary={song.artist}>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate font-[400]">{song.title}</span>
            {song.licenseType === "premium" ? <PremiumLabel /> : null}
          </span>
        </BackendRowTitle>
      </button>

      <div className="min-w-0 pr-7">
        <div className="filmwave-song-wave">
          <Waveform song={song} compact />
        </div>
      </div>

      <div className="text-[var(--text-secondary)]">
        {formatDuration(song.duration)}
      </div>
      <div className="text-[var(--text-secondary)]">{song.key || "—"}</div>
      <div className="text-[var(--text-secondary)]">
        {song.bpm ? `${song.bpm} BPM` : "—"}
      </div>
    </div>
  );
}

export default function ArtistReleaseTrackPicker({
  artistId,
  releaseType,
  existingTrackIds,
  disabled = false,
  onAdd,
}: ArtistReleaseTrackPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [unavailableTrackIds, setUnavailableTrackIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const existingIdSet = useMemo(
    () => new Set(existingTrackIds),
    [existingTrackIds],
  );
  const unavailableIdSet = useMemo(
    () => new Set(unavailableTrackIds),
    [unavailableTrackIds],
  );
  const singleHasTrack = releaseType === "single" && existingTrackIds.length >= 1;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setSearch("");
    setSelectedIds(new Set());
    setUnavailableTrackIds([]);
    setLoading(true);
    setLoadError("");

    async function loadSongs() {
      try {
        const response = await fetch(
          releaseType === "playlist"
            ? `/api/artists/${artistId}/playlist-track-picker`
            : `/api/artists/${artistId}/release-track-picker`,
          { cache: "no-store" },
        );
        const body = (await response.json().catch(() => ({}))) as PickerResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load tracks");
        }

        if (!cancelled) {
          setSongs(Array.isArray(body.songs) ? body.songs : []);
          setUnavailableTrackIds(
            releaseType === "playlist" || !Array.isArray(body.unavailable_song_ids)
              ? []
              : body.unavailable_song_ids,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load tracks",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [artistId, isOpen, releaseType]);

  const displayedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return songs.filter((song) => {
      if (!query) return true;

      return [song.title, song.artist, ...song.genres]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [search, songs]);

  function toggleSong(songId: string) {
    if (existingIdSet.has(songId) || unavailableIdSet.has(songId) || singleHasTrack) {
      return;
    }

    setSelectedIds((current) => {
      if (releaseType === "single") {
        return current.has(songId) ? new Set() : new Set([songId]);
      }

      const next = new Set(current);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }

  function addSelectedTracks() {
    if (selectedIds.size === 0) return;

    const orderedSelectedIds = songs
      .filter((song) => selectedIds.has(song.id))
      .map((song) => song.id);

    onAdd(orderedSelectedIds);
    setIsOpen(false);
  }

  const selectedCount = selectedIds.size;
  const title = releaseType === "single" ? "Add track" : "Add tracks";

  return (
    <>
      <BackendButton
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled || singleHasTrack}
      >
        Add track
      </BackendButton>

      <BackendModalShell
        isOpen={isOpen}
        title={title}
        onClose={() => setIsOpen(false)}
        closeLabel="Close track picker"
        maxWidth="max-w-[1120px]"
        maxHeight="780px"
        heightClassName="h-[780px]"
        bodyClassName="filmwave-admin-content-page"
        footer={
          <>
            <BackendButton type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </BackendButton>
            <BackendButton
              type="button"
              variant="primary"
              onClick={addSelectedTracks}
              disabled={selectedCount === 0}
            >
              {selectedCount <= 1 ? "Add Track" : `Add ${selectedCount} Tracks`}
            </BackendButton>
          </>
        }
      >
        <div className="mx-auto w-full max-w-[760px] pb-4">
          <BackendSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search tracks"
            variant="modal"
          />
        </div>

        <div className="-mx-5 min-h-0 flex-1 overflow-x-auto overflow-y-auto border-t border-[var(--border-subtle)]">
          <div className="min-w-[900px]">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center text-xs font-[320] text-[var(--text-muted)]">
                Loading tracks...
              </div>
            ) : loadError ? (
              <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs font-[320] text-[var(--danger)]">
                {loadError}
              </div>
            ) : displayedSongs.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs font-[320] text-[var(--text-muted)]">
                {search.trim() ? "No tracks match your search." : "No tracks are available."}
              </div>
            ) : (
              displayedSongs.map((song) => (
                <ReleasePickerSongRow
                  key={song.id}
                  song={song}
                  selected={selectedIds.has(song.id)}
                  alreadyAdded={
                    existingIdSet.has(song.id) || unavailableIdSet.has(song.id)
                  }
                  onToggle={() => toggleSong(song.id)}
                />
              ))
            )}
          </div>
        </div>
      </BackendModalShell>
    </>
  );
}