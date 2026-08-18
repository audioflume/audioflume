"use client";

import { useEffect, useState } from "react";

import ArtistSongAudioReplacement from "@/components/artists/ArtistSongAudioReplacement";
import ArtistSongEditorWithCollaborators from "@/components/artists/ArtistSongEditorWithCollaborators";
import ArtistSongUploadForm from "@/components/artists/ArtistSongUploadForm";
import AudioFileIcon from "@/components/icons/AudioFileIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
  bpm?: number | null;
  key?: string | null;
  created_at: string;
};

type ArtistSongsResponse = {
  songs?: ArtistSongSummary[];
  song?: ArtistSongSummary;
  error?: string;
};

type ArtistMusicUploaderProps = {
  artist: ArtistDashboardProfile;
  onUploaded: () => void;
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

export default function ArtistMusicUploader({
  artist,
  onUploaded,
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
  const [songs, setSongs] = useState<ArtistSongSummary[]>([]);
  const [creatingSong, setCreatingSong] = useState(false);
  const [editingSongId, setEditingSongId] = useState("");
  const [replacingSongId, setReplacingSongId] = useState("");
  const [submittingSongId, setSubmittingSongId] = useState("");
  const [catalogActionSongId, setCatalogActionSongId] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadRequestKey, setLoadRequestKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSongs([]);
    setCreatingSong(false);
    setEditingSongId("");
    setReplacingSongId("");
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
          setSongs(Array.isArray(body.songs) ? body.songs : []);
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

  function handleNewSongUploaded(song: ArtistSongSummary) {
    setSongs((current) => [song, ...current.filter((item) => item.id !== song.id)]);
    onUploaded();
  }

  function handleSongSaved(savedSong: { id: string; title: string }) {
    setSongs((current) =>
      current.map((song) =>
        song.id === savedSong.id ? { ...song, title: savedSong.title } : song,
      ),
    );
  }

  function handleAudioReplaced(
    replacedSong: ArtistSongSummary,
    resetForReview: boolean,
  ) {
    setSongs((current) =>
      current.map((song) =>
        song.id === replacedSong.id ? { ...song, ...replacedSong } : song,
      ),
    );
    setReplacingSongId("");
    setCatalogError("");
    setCatalogMessage(
      resetForReview
        ? "Audio replaced. Track returned to Draft for review."
        : "Audio replaced.",
    );
  }

  async function handleSubmitForReview(songId: string) {
    if (!canSubmit || submittingSongId || catalogActionSongId) return;

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
      setSongs((current) =>
        current.map((song) =>
          song.id === submittedSong.id ? { ...song, ...submittedSong } : song,
        ),
      );
      setCatalogMessage("Track submitted for review.");
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

  if (editingSongId) {
    return (
      <ArtistSongEditorWithCollaborators
        artist={artist}
        songId={editingSongId}
        onClose={() => setEditingSongId("")}
        onSaved={handleSongSaved}
      />
    );
  }

  const replacementSong = songs.find((song) => song.id === replacingSongId);
  if (replacementSong) {
    return (
      <ArtistSongAudioReplacement
        artist={artist}
        song={replacementSong}
        onClose={() => setReplacingSongId("")}
        onReplaced={handleAudioReplaced}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <div className="min-h-5 text-xs">
          {catalogError ? (
            <span className="text-[var(--status-error,#dc584f)]">{catalogError}</span>
          ) : catalogMessage ? (
            <span className="text-[var(--status-success,#48b571)]">{catalogMessage}</span>
          ) : null}
        </div>

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
          <div className="min-w-[1040px]">
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

            {songs.length > 0 ? (
              <div>
                {songs.map((song, index) => {
                  const editable =
                    song.status === "draft" || song.status === "changes_requested";
                  const replaceable =
                    canEdit &&
                    song.status !== "processing" &&
                    song.status !== "submitted" &&
                    song.status !== "archived";
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

                  return (
                    <div
                      key={song.id}
                      className="grid min-h-[72px] grid-cols-[60px_minmax(180px,1.5fr)_70px_70px_70px_minmax(360px,auto)_120px] items-center gap-4 px-5 text-xs"
                      style={{
                        borderBottom:
                          index === songs.length - 1
                            ? "none"
                            : "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center">
                        <div className="flex h-[52px] w-[52px] items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                          <AudioFileIcon size={16} />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-medium leading-tight text-[var(--text-primary)]">
                          {song.title}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                          Uploaded {formatDate(song.created_at)}
                        </div>
                      </div>

                      <div className="text-[var(--text-secondary)]">
                        {formatDuration(Number(song.duration))}
                      </div>

                      <div className="text-[var(--text-secondary)]">
                        {song.key || "—"}
                      </div>

                      <div className="text-[var(--text-secondary)]">
                        {song.bpm == null ? "—" : song.bpm}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {editable ? (
                          <button
                            type="button"
                            disabled={actionsBusy}
                            onClick={() => setEditingSongId(song.id)}
                            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                          >
                            Edit details
                          </button>
                        ) : null}
                        {replaceable ? (
                          <button
                            type="button"
                            disabled={actionsBusy}
                            onClick={() => setReplacingSongId(song.id)}
                            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                          >
                            Replace audio
                          </button>
                        ) : null}
                        {editable && canSubmit ? (
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

                      <div className="flex justify-end">
                        <span
                          className={`filmwave-backend-status-badge ${statusClassName(song.status)}`}
                        >
                          {formatStatus(song.status)}
                        </span>
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
