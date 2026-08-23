"use client";

import { useEffect, useMemo, useState } from "react";
import { PremiumLabel } from "@filmwave/shared";

import ArtistSongEditorWithCollaborators from "@/components/artists/ArtistSongEditorWithCollaborators";
import ArtistSongUploadForm from "@/components/artists/ArtistSongUploadForm";
import BackendSearchBar from "@/components/backend/BackendSearchBar";
import AudioFileIcon from "@/components/icons/AudioFileIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import UploadIcon from "@/components/icons/UploadIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import type { Song } from "@/lib/types";

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
  bpm?: number | null;
  key?: string | null;
  created_at: string;
  submitted_at?: string | null;
  revision_pending?: boolean;
  revision_updated_at?: string | null;
  live_status?: string;
  player_song?: Song;
};

type ArtistSongsResponse = {
  songs?: ArtistSongSummary[];
  song?: ArtistSongSummary;
  error?: string;
};

type ArtistMusicUploaderProps = {
  artist: ArtistDashboardProfile;
  onUploaded: () => void;
  onNotificationCreated?: () => void;
};

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClassName(status: string) {
  if (status === "rejected") {
    return "bg-[var(--danger-hover,rgba(255,93,87,0.1))] text-[var(--danger,#ff5d57)]";
  }
  if (status === "approved" || status === "published") {
    return "bg-[rgba(72,181,113,0.12)] text-[#48b571]";
  }
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function getRecentActivityTime(song: ArtistSongSummary) {
  const value = song.revision_updated_at ?? song.submitted_at ?? song.created_at;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortByRecentActivity(songs: ArtistSongSummary[]) {
  return [...songs].sort(
    (a, b) => getRecentActivityTime(b) - getRecentActivityTime(a),
  );
}

export default function ArtistMusicUploader({
  artist,
  onUploaded,
  onNotificationCreated,
}: ArtistMusicUploaderProps) {
  const canUpload =
    artist.status === "approved" &&
    artist.permissions.includes("catalog:upload");
  const canEdit =
    artist.status === "approved" &&
    artist.permissions.includes("catalog:edit");
  const canSubmit =
    artist.status === "approved" &&
    artist.permissions.includes("catalog:submit");
  const { currentSong, isPlaying, togglePlayPause, seekTo, setQueue } = usePlayer();
  const [songs, setSongs] = useState<ArtistSongSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingSong, setCreatingSong] = useState(false);
  const [editingSongId, setEditingSongId] = useState("");
  const [submittingSongId, setSubmittingSongId] = useState("");
  const [catalogActionSongId, setCatalogActionSongId] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadRequestKey, setLoadRequestKey] = useState(0);

  const visibleSongs = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    return normalizedSearchQuery
      ? songs.filter((song) =>
          song.title.toLowerCase().includes(normalizedSearchQuery),
        )
      : songs;
  }, [searchQuery, songs]);

  useEffect(() => {
    let cancelled = false;
    setSongs([]);
    setSearchQuery("");
    setCreatingSong(false);
    setEditingSongId("");
    setSubmittingSongId("");
    setCatalogActionSongId("");
    setCatalogMessage("");
    setCatalogError("");
    setLoadError("");
    setLoadState("loading");

    async function loadSongs() {
      try {
        const response = await fetch(`/api/artists/${artist.id}/songs`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as ArtistSongsResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load artist music");
        }

        if (!cancelled) {
          setSongs(
            sortByRecentActivity(Array.isArray(body.songs) ? body.songs : []),
          );
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
          setLoadError(
            error instanceof Error ? error.message : "Failed to load artist music",
          );
        }
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [artist.id, loadRequestKey]);

  useEffect(() => {
    setQueue(
      visibleSongs
        .map((song) => song.player_song)
        .filter((song): song is Song => Boolean(song?.audioUrl)),
    );
  }, [setQueue, visibleSongs]);

  function handleNewSongUploaded(song: ArtistSongSummary) {
    setSongs((current) =>
      sortByRecentActivity([
        song,
        ...current.filter((item) => item.id !== song.id),
      ]),
    );
    onUploaded();
  }

  function handleSongSaved(
    savedSong: { id: string; title: string },
    revisionPending = false,
  ) {
    const currentSongSummary = songs.find((song) => song.id === savedSong.id);

    if (revisionPending) {
      const notificationCreated = !currentSongSummary?.revision_pending;
      const resubmittedAt = new Date().toISOString();
      setSongs((current) =>
        sortByRecentActivity(
          current.map((song) =>
            song.id === savedSong.id
              ? {
                  ...song,
                  title: savedSong.title,
                  status: "submitted",
                  revision_pending: true,
                  revision_updated_at: resubmittedAt,
                }
              : song,
          ),
        ),
      );
      setCatalogError("");
      setCatalogMessage(
        "Track details saved. The song has been resubmitted for review.",
      );
      if (notificationCreated) onNotificationCreated?.();
      return;
    }

    const keepsLiveVersion =
      currentSongSummary?.status === "published" ||
      currentSongSummary?.status === "approved";

    if (keepsLiveVersion) {
      setCatalogError("");
      setCatalogMessage(
        "Track details saved. The song has been resubmitted for review.",
      );
      return;
    }

    setSongs((current) =>
      current.map((song) =>
        song.id === savedSong.id ? { ...song, title: savedSong.title } : song,
      ),
    );
  }

  function handlePlayClick(song: ArtistSongSummary) {
    const playerSong = song.player_song;
    if (!playerSong?.audioUrl) return;

    if (currentSong?.id === playerSong.id) {
      togglePlayPause(playerSong);
      return;
    }

    seekTo(playerSong, 0, currentSong ? isPlaying : true);
  }

  async function handleSubmitForReview(songId: string) {
    if (!canSubmit || submittingSongId || catalogActionSongId) return;

    const currentSongSummary = songs.find((song) => song.id === songId);
    const wasResubmission = currentSongSummary?.status === "changes_requested";

    try {
      setCatalogError("");
      setCatalogMessage("");
      setSubmittingSongId(songId);

      const response = await fetch(`/api/artists/${artist.id}/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      const body = (await response.json().catch(() => ({}))) as ArtistSongsResponse;

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to submit track");
      }

      const submittedSong = body.song;
      const resubmittedAt =
        submittedSong.revision_updated_at ??
        submittedSong.submitted_at ??
        new Date().toISOString();

      setSongs((current) => {
        const updated = current.map((song) =>
          song.id === submittedSong.id
            ? {
                ...song,
                ...submittedSong,
                ...(submittedSong.revision_pending
                  ? { revision_updated_at: resubmittedAt }
                  : { submitted_at: resubmittedAt }),
              }
            : song,
        );
        return wasResubmission ? sortByRecentActivity(updated) : updated;
      });
      setCatalogMessage(
        wasResubmission
          ? "Track resubmitted for review."
          : "Track submitted for review.",
      );
      if (wasResubmission) onNotificationCreated?.();
    } catch (error) {
      setCatalogError(
        error instanceof Error ? error.message : "Failed to submit track",
      );
    } finally {
      setSubmittingSongId("");
    }
  }

  async function handleCatalogueAction(
    songId: string,
    action: "archive" | "restore",
  ) {
    if (!canEdit || submittingSongId || catalogActionSongId) return;

    try {
      setCatalogError("");
      setCatalogMessage("");
      setCatalogActionSongId(songId);

      const response = await fetch(
        `/api/artists/${artist.id}/songs/${songId}/catalog`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ArtistSongsResponse;

      if (!response.ok || !body.song) {
        throw new Error(
          body.error ||
            (action === "archive"
              ? "Failed to archive track"
              : "Failed to restore track"),
        );
      }

      setSongs((current) =>
        current.map((song) =>
          song.id === body.song?.id ? { ...song, ...body.song } : song,
        ),
      );
      setCatalogMessage(
        action === "archive" ? "Track archived." : "Track restored.",
      );
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : action === "archive"
            ? "Failed to archive track"
            : "Failed to restore track",
      );
    } finally {
      setCatalogActionSongId("");
    }
  }

  if (creatingSong) {
    return (
      <ArtistSongUploadForm
        artist={artist}
        onClose={() => setCreatingSong(false)}
        onUploaded={handleNewSongUploaded}
      />
    );
  }

  const editingSong = songs.find((song) => song.id === editingSongId);
  if (editingSong) {
    return (
      <ArtistSongEditorWithCollaborators
        artist={artist}
        song={editingSong}
        onClose={() => {
          setEditingSongId("");
          setLoadRequestKey((current) => current + 1);
        }}
        onSaved={handleSongSaved}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <BackendSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search"
          className="w-full max-w-[500px]"
          clearLabel="Clear music search"
        />

        {canUpload ? (
          <button
            type="button"
            onClick={() => setCreatingSong(true)}
            className="filmwave-backend-button filmwave-backend-button-primary"
          >
            <UploadIcon size={15} />
            Upload Song
          </button>
        ) : null}
      </div>

      {catalogError || catalogMessage ? (
        <div className="mb-4 min-h-5 text-xs">
          {catalogError ? (
            <span className="text-[var(--status-error,#dc584f)]">{catalogError}</span>
          ) : catalogMessage ? (
            <span className="text-[var(--status-success,#48b571)]">{catalogMessage}</span>
          ) : null}
        </div>
      ) : null}

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Recent uploads</h2>
        </div>

        {!canUpload ? (
          <div className="border-b border-[var(--border-subtle)] px-5 py-3 text-xs text-[var(--text-muted)]">
            {artist.status !== "approved"
              ? "Your artist profile must be approved before music can be uploaded."
              : "Your artist role does not include music upload access."}
          </div>
        ) : null}

        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[980px]">
            {loadState === "loading" ? (
              <div className="flex min-h-[180px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                Loading music...
              </div>
            ) : null}

            {loadState === "error" && songs.length === 0 ? (
              <div className="flex min-h-[180px] items-center justify-center gap-3 px-5 text-xs">
                <span className="text-[var(--text-muted)]">
                  {loadError || "Music could not be loaded."}
                </span>
                <button
                  type="button"
                  onClick={() => setLoadRequestKey((current) => current + 1)}
                  className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary shrink-0"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {loadState === "ready" && songs.length === 0 ? (
              <div className="flex min-h-[180px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                No tracks uploaded yet.
              </div>
            ) : null}

            {loadState === "ready" && songs.length > 0 && visibleSongs.length === 0 ? (
              <div className="flex min-h-[180px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                No tracks match your search.
              </div>
            ) : null}

            {visibleSongs.length > 0 ? (
              <div>
                {visibleSongs.map((song, index) => {
                  const editable =
                    canEdit &&
                    song.status !== "processing" &&
                    song.status !== "submitted" &&
                    song.status !== "archived";
                  const canSubmitForReview =
                    canSubmit &&
                    (song.status === "draft" || song.status === "changes_requested");
                  const archivable =
                    canEdit &&
                    song.status !== "processing" &&
                    song.status !== "archived";
                  const restorable = canEdit && song.status === "archived";
                  const submitting = submittingSongId === song.id;
                  const changingCatalogue = catalogActionSongId === song.id;
                  const actionsBusy = Boolean(
                    submittingSongId || catalogActionSongId,
                  );
                  const isCurrentSong = currentSong?.id === song.id;
                  const rowIsPlaying = isCurrentSong && isPlaying;
                  const playerSong = song.player_song;

                  return (
                    <div
                      key={song.id}
                      className="grid min-h-[72px] grid-cols-[60px_minmax(220px,1.6fr)_76px_90px_76px_110px_124px_minmax(220px,auto)] items-center gap-4 px-5 text-xs"
                      style={{
                        borderBottom:
                          index === visibleSongs.length - 1
                            ? "none"
                            : "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handlePlayClick(song)}
                          disabled={!playerSong?.audioUrl}
                          className="group/artist-song-thumb relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden bg-[var(--bg-tertiary)] text-[var(--text-muted)] disabled:cursor-default"
                          style={{ "--filmwave-song-card-play-size": "32px" } as React.CSSProperties}
                          aria-label={rowIsPlaying ? "Pause song" : "Play song"}
                        >
                          {playerSong?.coverArt ? (
                            <img
                              src={playerSong.coverArt}
                              alt={song.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <AudioFileIcon size={16} />
                          )}
                          {playerSong?.audioUrl ? (
                            <span
                              className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] transition ${
                                isCurrentSong
                                  ? "opacity-100"
                                  : "opacity-0 group-hover/artist-song-thumb:opacity-100"
                              }`}
                            >
                              <span className="filmwave-song-play-button">
                                {rowIsPlaying ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
                              </span>
                            </span>
                          ) : null}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlayClick(song)}
                        disabled={!playerSong?.audioUrl}
                        className="min-w-0 cursor-pointer text-left disabled:cursor-default"
                      >
                        <div className="flex min-w-0 items-center gap-1.5 font-medium leading-tight text-[var(--text-primary)]">
                          <span className="min-w-0 truncate">{song.title}</span>
                          {playerSong?.licenseType === "premium" ? <PremiumLabel /> : null}
                        </div>
                      </button>

                      <div className="text-[var(--text-secondary)]">
                        {formatDuration(Number(song.duration))}
                      </div>

                      <div className="text-[var(--text-secondary)]">
                        {song.key || "—"}
                      </div>

                      <div className="text-[var(--text-secondary)]">
                        {song.bpm == null ? "—" : song.bpm}
                      </div>

                      <div className="text-[var(--text-secondary)]">
                        {formatDate(song.created_at)}
                      </div>

                      <div className="flex min-w-0 items-center">
                        <span
                          className={`filmwave-backend-status-badge ${statusClassName(song.status)}`}
                        >
                          {formatStatus(song.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {editable ? (
                          <button
                            type="button"
                            disabled={actionsBusy}
                            onClick={() => setEditingSongId(song.id)}
                            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                          >
                            Edit
                          </button>
                        ) : null}
                        {canSubmitForReview ? (
                          <button
                            type="button"
                            disabled={actionsBusy}
                            onClick={() => void handleSubmitForReview(song.id)}
                            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-primary"
                          >
                            {submitting
                              ? "Submitting..."
                              : song.status === "changes_requested"
                                ? "Resubmit"
                                : "Submit for review"}
                          </button>
                        ) : null}
                        {archivable ? (
                          <button
                            type="button"
                            disabled={actionsBusy}
                            onClick={() =>
                              void handleCatalogueAction(song.id, "archive")
                            }
                            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                          >
                            {changingCatalogue ? "Archiving..." : "Archive"}
                          </button>
                        ) : null}
                        {restorable ? (
                          <button
                            type="button"
                            disabled={actionsBusy}
                            onClick={() =>
                              void handleCatalogueAction(song.id, "restore")
                            }
                            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                          >
                            {changingCatalogue ? "Restoring..." : "Restore"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}