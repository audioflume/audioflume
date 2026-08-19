"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SongCardShell } from "@filmwave/shared";

import AdminCheckboxStyles from "@/components/admin/AdminCheckboxStyles";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import CheckIcon from "@/components/icons/CheckIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import ModalShell from "@/components/ModalShell";
import Waveform from "@/components/Waveform";
import {
  backendModalCancelButtonClass,
  backendModalPrimaryButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

type ReleaseType = "single" | "ep" | "album" | "playlist";

type PickerResponse = {
  songs?: Song[];
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
  onToggle,
}: {
  song: Song;
  selected: boolean;
  onToggle: () => void;
}) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const isCurrentSong = currentSong?.id === song.id;
  const actuallyPlaying = isCurrentSong && isPlaying;
  const visibleGenres = song.genres.slice(0, 3);

  return (
    <div className="flex min-w-0 items-center px-5 transition-colors hover:bg-[var(--bg-hover)]">
      <label
        className="admin-song-select-wrap is-visible flex h-[86px] w-12 shrink-0 cursor-pointer items-center justify-center"
        aria-label={`Select ${song.title}`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="admin-song-select-input sr-only"
        />
        <span className="admin-song-select-box flex items-center justify-center">
          <CheckIcon size={11} strokeWidth={3} />
        </span>
      </label>

      <div className="min-w-0 flex-1">
        <SongCardShell
          className={isCurrentSong ? "is-current" : ""}
          coverLabel={actuallyPlaying ? "Pause song" : "Play song"}
          onCoverClick={() => togglePlayPause(song)}
          onInfoClick={onToggle}
          showDivider={false}
          cover={
            song.coverArt ? (
              <Image
                src={song.coverArt}
                alt={song.title}
                fill
                sizes="62px"
                className="object-cover"
              />
            ) : (
              <div className="h-[62px] w-[62px] bg-[var(--bg-hover)]" />
            )
          }
          playOverlay={
            actuallyPlaying ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />
          }
          title={song.title}
          artist={song.artist}
          waveform={<Waveform song={song} showEditPointMarkers={false} />}
          duration={formatDuration(song.duration)}
          genre={visibleGenres.length > 0 ? visibleGenres.join(", ") : null}
          keyMeta={song.key || "—"}
          bpmMeta={song.bpm ? `${song.bpm} BPM` : "—"}
          actions={null}
        />
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const existingIdSet = useMemo(
    () => new Set(existingTrackIds),
    [existingTrackIds],
  );
  const singleHasTrack = releaseType === "single" && existingTrackIds.length >= 1;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setSearch("");
    setSelectedIds(new Set());
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
      if (existingIdSet.has(song.id)) return false;
      if (!query) return true;

      return [song.title, song.artist, ...song.genres]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [existingIdSet, search, songs]);

  function toggleSong(songId: string) {
    if (existingIdSet.has(songId) || singleHasTrack) return;

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
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled || singleHasTrack}
        className="filmwave-backend-button filmwave-backend-button-secondary"
      >
        Add track
      </button>

      <ModalShell
        isOpen={isOpen}
        title={title}
        onClose={() => setIsOpen(false)}
        closeLabel="Close track picker"
        maxWidth="max-w-[1120px]"
        maxHeight="780px"
        centerTitle
        inputCorners="rounded"
        background="var(--bg-primary)"
        bodyClassName="filmwave-admin-content-page flex min-h-0 flex-1 flex-col px-5 pb-0"
        contentClassName="h-[780px] max-h-[calc(100vh-64px)] !rounded-[10px] [&>div:first-of-type>h2]:!text-base [&>div:first-of-type>h2]:!font-medium [&>div:first-of-type>h2]:!tracking-[-0.03em]"
        footerClassName="justify-end"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={backendModalCancelButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addSelectedTracks}
              disabled={selectedCount === 0}
              className={backendModalPrimaryButtonClass}
            >
              {selectedCount <= 1 ? "Add Track" : `Add ${selectedCount} Tracks`}
            </button>
          </>
        }
      >
        <AdminCheckboxStyles />

        <div className="mx-auto w-full max-w-[760px] pb-4">
          <AdminSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search tracks"
            variant="modal"
          />
        </div>

        <div className="-mx-5 min-h-0 flex-1 overflow-y-auto border-t border-[var(--border-subtle)]">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-[var(--text-muted)]">
              Loading tracks...
            </div>
          ) : loadError ? (
            <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs text-[var(--danger)]">
              {loadError}
            </div>
          ) : displayedSongs.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)]">
              {search.trim() ? "No tracks match your search." : "No tracks are available."}
            </div>
          ) : (
            displayedSongs.map((song) => (
              <ReleasePickerSongRow
                key={song.id}
                song={song}
                selected={selectedIds.has(song.id)}
                onToggle={() => toggleSong(song.id)}
              />
            ))
          )}
        </div>
      </ModalShell>
    </>
  );
}
