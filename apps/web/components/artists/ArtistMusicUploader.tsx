"use client";

import { FormEvent, useEffect, useState } from "react";

import ArtistSongEditor from "@/components/artists/ArtistSongEditor";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
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

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downsamplePeaks(peaks: Float32Array, targetLength = 1500) {
  if (peaks.length <= targetLength) {
    return Array.from(peaks).map((peak) => Number(peak.toFixed(6)));
  }

  const output: number[] = [];
  const blockSize = Math.max(1, Math.floor(peaks.length / targetLength));

  for (let index = 0; index < targetLength; index += 1) {
    const start = index * blockSize;
    const end = Math.min(peaks.length, start + blockSize);
    let strongestPeak = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const sample = peaks[sampleIndex];
      if (Math.abs(sample) > Math.abs(strongestPeak)) {
        strongestPeak = sample;
      }
    }

    output.push(Number(strongestPeak.toFixed(6)));
  }

  return output;
}

async function analyzeAudioFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const peaks = downsamplePeaks(audioBuffer.getChannelData(0));

    return {
      waveformPeaks: JSON.stringify(peaks),
      duration: audioBuffer.duration,
    };
  } finally {
    await audioContext.close();
  }
}

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

export default function ArtistMusicUploader({
  artist,
  onUploaded,
}: ArtistMusicUploaderProps) {
  const canUpload =
    artist.status === "approved" &&
    artist.permissions.includes("catalog:upload");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [songs, setSongs] = useState<ArtistSongSummary[]>([]);
  const [editingSongId, setEditingSongId] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [stage, setStage] = useState<"idle" | "analyzing" | "uploading">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSongs([]);
    setEditingSongId("");
    setLoadState("loading");
    setMessage("");
    setError("");
    setTitle("");
    setFile(null);
    setFileInputKey((current) => current + 1);

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
      } catch (loadError) {
        if (!cancelled) {
          setLoadState("error");
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load artist music",
          );
        }
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [artist.id]);

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setMessage("");
    setError("");

    if (selectedFile && !title.trim()) {
      setTitle(titleFromFileName(selectedFile.name));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpload || !file || !title.trim() || stage !== "idle") return;

    try {
      setError("");
      setMessage("");
      setStage("analyzing");

      const analysis = await analyzeAudioFile(file);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("waveformPeaks", analysis.waveformPeaks);
      formData.append("duration", String(analysis.duration));

      setStage("uploading");

      const response = await fetch(`/api/artists/${artist.id}/songs`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => ({}))) as ArtistSongsResponse;

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to upload track");
      }

      const uploadedSong = body.song as ArtistSongSummary;
      setSongs((current) => [uploadedSong, ...current]);
      setTitle("");
      setFile(null);
      setFileInputKey((current) => current + 1);
      setMessage("");
      setEditingSongId(uploadedSong.id);
      onUploaded();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload track",
      );
    } finally {
      setStage("idle");
    }
  }

  function handleSongSaved(savedSong: { id: string; title: string }) {
    setSongs((current) =>
      current.map((song) =>
        song.id === savedSong.id ? { ...song, title: savedSong.title } : song,
      ),
    );
  }

  const busy = stage !== "idle";

  if (editingSongId) {
    return (
      <ArtistSongEditor
        artist={artist}
        songId={editingSongId}
        onClose={() => setEditingSongId("")}
        onSaved={handleSongSaved}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Upload music
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Upload a master track to start building your Audioflume catalogue. After processing, you can add metadata, credits, and rights information.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 p-5">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Track title
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                disabled={!canUpload || busy}
                placeholder="Track title"
                className="h-10 w-full rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Master audio
              </span>
              <div className="flex min-h-12 flex-wrap items-center gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)]">
                  {file ? file.name : "Choose an audio file"}
                </span>
                <span className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-primary)] transition hover:border-[var(--text-muted)]">
                  Choose file
                </span>
              </div>
              <input
                key={fileInputKey}
                type="file"
                accept="audio/*"
                disabled={!canUpload || busy}
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
                className="sr-only"
              />
            </label>

            {!canUpload ? (
              <div className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-xs leading-5 text-[var(--text-muted)]">
                {artist.status !== "approved"
                  ? "Your artist profile must be approved before music can be uploaded."
                  : "Your artist role does not include music upload access."}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
            <div className="min-h-5 text-xs">
              {error ? (
                <span className="text-[var(--status-error)]">{error}</span>
              ) : message ? (
                <span className="text-[var(--status-success)]">{message}</span>
              ) : busy ? (
                <span className="text-[var(--text-muted)]">
                  {stage === "analyzing"
                    ? "Preparing waveform..."
                    : "Uploading and processing playback files..."}
                </span>
              ) : null}
            </div>

            {canUpload ? (
              <button
                type="submit"
                disabled={busy || !file || !title.trim()}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {stage === "analyzing"
                  ? "Preparing..."
                  : stage === "uploading"
                    ? "Uploading..."
                    : "Upload track"}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Recent uploads
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Open a draft track to manage its metadata, credits, and ownership information.
          </p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {loadState === "loading" ? (
            <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
              Loading music...
            </div>
          ) : null}

          {loadState === "error" && songs.length === 0 ? (
            <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
              Music could not be loaded.
            </div>
          ) : null}

          {loadState === "ready" && songs.length === 0 ? (
            <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
              No tracks uploaded yet.
            </div>
          ) : null}

          {songs.map((song) => (
            <div
              key={song.id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_90px_120px_90px_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {song.title}
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-muted)] sm:hidden">
                  {formatDate(song.created_at)}
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {formatDuration(Number(song.duration))}
              </div>
              <div className="hidden text-xs text-[var(--text-muted)] sm:block">
                {formatDate(song.created_at)}
              </div>
              <div>
                <span className="inline-flex h-7 items-center rounded-full bg-[var(--bg-tertiary)] px-3 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                  {formatStatus(song.status)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSongId(song.id)}
                className="inline-flex h-8 items-center justify-center rounded-[7px] border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Edit details
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
