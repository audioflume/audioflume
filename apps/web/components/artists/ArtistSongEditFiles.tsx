"use client";

import { useEffect, useState } from "react";

import BackendSongFileUpload from "@/components/backend/BackendSongFileUpload";
import { analyzeArtistSongAudioFile } from "@/lib/artistSongAudioAnalysis";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

export type ArtistSongCurrentRelease = {
  id: string;
  title: string;
  cover_image_url: string | null;
  release_type: string;
  status: string;
};

type EditFileSong = {
  id: string;
  title: string;
  status: string;
  audio_url: string | null;
  playback_url: string | null;
  hls_url: string | null;
  waveform_peaks: string | null;
  duration: number | string | null;
  size_bytes: number | string | null;
  cover_url: string | null;
  stems: string | null;
};

type EditFilesResponse = {
  song?: EditFileSong;
  current_release?: ArtistSongCurrentRelease | null;
  revision_status?: string | null;
  revision_pending?: boolean;
  stems?: string[];
  error?: string;
};

type ArtworkResponse = {
  song?: {
    id: string;
    cover_url: string | null;
  };
  revision_pending?: boolean;
  error?: string;
};

type ArtistSongEditFilesProps = {
  artist: ArtistDashboardProfile;
  songId: string;
  onReleaseLoaded: (release: ArtistSongCurrentRelease | null) => void;
  onRevisionPending?: () => void;
};

function fileNameFromUrl(value: string | null) {
  if (!value) return "";

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  } catch {
    return value.split("/").filter(Boolean).pop() ?? value;
  }
}

function stemLabels(value: string | null) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => fileNameFromUrl(item) || item);
}

export default function ArtistSongEditFiles({
  artist,
  songId,
  onReleaseLoaded,
  onRevisionPending,
}: ArtistSongEditFilesProps) {
  const canEdit = artist.permissions.includes("catalog:edit");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"" | "audio" | "artwork" | "stems">("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [stemFiles, setStemFiles] = useState<File[]>([]);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkObjectUrl, setArtworkObjectUrl] = useState<string | null>(null);
  const [audioLabel, setAudioLabel] = useState("");
  const [existingStemLabels, setExistingStemLabels] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [currentRelease, setCurrentRelease] =
    useState<ArtistSongCurrentRelease | null>(null);
  const [audioStatus, setAudioStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void fetch(`/api/artists/${artist.id}/songs/${songId}/edit-files`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as EditFilesResponse;
        if (!response.ok || !body.song) {
          throw new Error(body.error || "Failed to load track files");
        }
        if (cancelled) return;

        const release = body.current_release ?? null;
        setAudioLabel(fileNameFromUrl(body.song.audio_url) || "Current audio file");
        setExistingStemLabels(stemLabels(body.song.stems));
        setCoverUrl(body.song.cover_url ?? null);
        setCurrentRelease(release);
        onReleaseLoaded(release);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load track files",
          );
          onReleaseLoaded(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist.id, onReleaseLoaded, songId]);

  useEffect(() => {
    if (!artworkFile) {
      setArtworkObjectUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(artworkFile);
    setArtworkObjectUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [artworkFile]);

  async function handleAudioFileChange(file: File | null) {
    setAudioFile(file);
    setAudioStatus("");
    setMessage("");
    setError("");
    if (!file) return;

    try {
      setBusy("audio");
      setAudioStatus("Generating waveform peaks and estimating BPM/key...");
      const analysis = await analyzeArtistSongAudioFile(file, artist.id, 1500);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("waveformPeaks", analysis.peaksJson);
      formData.append("duration", String(analysis.duration));

      setAudioStatus("Uploading and processing replacement audio...");
      const response = await fetch(
        `/api/artists/${artist.id}/songs/${songId}/audio`,
        { method: "POST", body: formData },
      );
      const body = (await response.json().catch(() => ({}))) as EditFilesResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to replace track audio");
      }

      setAudioLabel(file.name);
      setAudioFile(null);
      setAudioStatus("");
      setMessage(
        body.revision_pending
          ? "Audio change sent for approval. The current version stays live until approved."
          : "Audio updated.",
      );
      if (body.revision_pending) onRevisionPending?.();
    } catch (audioError) {
      setAudioFile(null);
      setAudioStatus("");
      setError(
        audioError instanceof Error ? audioError.message : "Failed to replace track audio",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleArtworkFileChange(file: File | null) {
    setArtworkFile(file);
    setMessage("");
    setError("");
    if (!file || currentRelease) return;

    try {
      setBusy("artwork");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/artists/${artist.id}/songs/${songId}/artwork`,
        { method: "POST", body: formData },
      );
      const body = (await response.json().catch(() => ({}))) as ArtworkResponse;

      if (!response.ok || !body.song?.cover_url) {
        throw new Error(body.error || "Failed to update song artwork");
      }

      setCoverUrl(body.song.cover_url);
      setArtworkFile(null);
      setMessage(
        body.revision_pending
          ? "Artwork change sent for approval. The current version stays live until approved."
          : "Artwork updated.",
      );
      if (body.revision_pending) onRevisionPending?.();
    } catch (artworkError) {
      setArtworkFile(null);
      setError(
        artworkError instanceof Error ? artworkError.message : "Failed to update song artwork",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleRemoveArtwork() {
    if (currentRelease) return;
    if (artworkFile) {
      setArtworkFile(null);
      return;
    }
    if (!coverUrl) return;

    try {
      setBusy("artwork");
      setMessage("");
      setError("");
      const response = await fetch(
        `/api/artists/${artist.id}/songs/${songId}/artwork`,
        { method: "DELETE" },
      );
      const body = (await response.json().catch(() => ({}))) as ArtworkResponse;

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to remove song artwork");
      }

      setCoverUrl(null);
      setMessage(
        body.revision_pending
          ? "Artwork removal sent for approval. The current version stays live until approved."
          : "Artwork removed.",
      );
      if (body.revision_pending) onRevisionPending?.();
    } catch (artworkError) {
      setError(
        artworkError instanceof Error ? artworkError.message : "Failed to remove song artwork",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleStemFilesChange(files: File[]) {
    setStemFiles(files);
    setMessage("");
    setError("");
    if (files.length === 0) return;

    try {
      setBusy("stems");
      const formData = new FormData();
      files.forEach((file) => formData.append("stems", file));

      const response = await fetch(
        `/api/artists/${artist.id}/songs/${songId}/stems`,
        { method: "POST", body: formData },
      );
      const body = (await response.json().catch(() => ({}))) as EditFilesResponse;

      if (!response.ok || !Array.isArray(body.stems)) {
        throw new Error(body.error || "Failed to update song stems");
      }

      setExistingStemLabels(files.map((file) => file.name));
      setStemFiles([]);
      setMessage(
        body.revision_pending
          ? "Stem changes sent for approval. The current version stays live until approved."
          : "Stems updated.",
      );
      if (body.revision_pending) onRevisionPending?.();
    } catch (stemError) {
      setStemFiles([]);
      setError(
        stemError instanceof Error ? stemError.message : "Failed to update song stems",
      );
    } finally {
      setBusy("");
    }
  }

  const releaseArtworkMode = Boolean(currentRelease);
  const displayedArtworkUrl = currentRelease?.cover_image_url ?? artworkObjectUrl ?? coverUrl;
  const disabled = loading || Boolean(busy) || !canEdit;

  return (
    <>
      <BackendSongFileUpload
        audioFile={audioFile}
        onAudioFileChange={(file) => void handleAudioFileChange(file)}
        audioExistingLabel={audioLabel}
        audioStatus={audioStatus}
        audioStatusBusy={busy === "audio"}
        stemFiles={stemFiles}
        onStemFilesChange={(files) => void handleStemFilesChange(files)}
        existingStemLabels={existingStemLabels}
        artworkFile={artworkFile}
        artworkPreviewUrl={displayedArtworkUrl}
        onArtworkFileChange={(file) => void handleArtworkFileChange(file)}
        onRemoveArtwork={() => void handleRemoveArtwork()}
        artworkTitle={releaseArtworkMode ? "Release image" : "Cover image"}
        artworkActionLabel={
          releaseArtworkMode ? "Choose Release Image" : "Choose Cover Art"
        }
        artworkDisabled={releaseArtworkMode}
        artworkHelp={
          currentRelease
            ? `This song uses ${currentRelease.title} release artwork.`
            : undefined
        }
        disabled={disabled}
      />

      {error ? (
        <div className="text-xs leading-5 text-[var(--status-error,#dc584f)]">{error}</div>
      ) : message ? (
        <div className="text-xs leading-5 text-[var(--status-success,#48b571)]">
          {message}
        </div>
      ) : null}
    </>
  );
}
