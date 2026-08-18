"use client";

import { useRef, useState } from "react";

import AudioFileIcon from "@/components/icons/AudioFileIcon";
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

type ReplacementResponse = {
  song?: ArtistSongSummary;
  reset_for_review?: boolean;
  error?: string;
};

type ArtistSongAudioReplacementProps = {
  artist: ArtistDashboardProfile;
  song: ArtistSongSummary;
  onClose: () => void;
  onReplaced: (song: ArtistSongSummary, resetForReview: boolean) => void;
};

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
    return {
      waveformPeaks: JSON.stringify(
        downsamplePeaks(audioBuffer.getChannelData(0)),
      ),
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

export default function ArtistSongAudioReplacement({
  artist,
  song,
  onClose,
  onReplaced,
}: ArtistSongAudioReplacementProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState("[]");
  const [duration, setDuration] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState("");

  async function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setWaveformPeaks("[]");
    setDuration(0);
    setError("");

    if (!nextFile) return;

    try {
      setAnalyzing(true);
      const analysis = await analyzeAudioFile(nextFile);
      setWaveformPeaks(analysis.waveformPeaks);
      setDuration(analysis.duration);
    } catch (analysisError) {
      setFile(null);
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Audio could not be analyzed",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function replaceAudio() {
    if (!file || analyzing || replacing) return;

    try {
      setReplacing(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("waveformPeaks", waveformPeaks);
      formData.append("duration", String(duration));

      const response = await fetch(
        `/api/artists/${artist.id}/songs/${song.id}/audio`,
        { method: "POST", body: formData },
      );
      const body = (await response.json().catch(() => ({}))) as ReplacementResponse;

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to replace track audio");
      }

      onReplaced(body.song, Boolean(body.reset_for_review));
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : "Failed to replace track audio",
      );
    } finally {
      setReplacing(false);
    }
  }

  const resetsReview =
    song.status === "published" ||
    song.status === "approved" ||
    song.status === "rejected";

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={replacing}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Music
        </button>
      </div>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Replace audio</h2>
        </div>

        <div className="grid gap-5 p-5">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {song.title}
            </div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {resetsReview
                ? "Replacing this audio will return the track to Draft so the new master can be reviewed again."
                : "Metadata, credits, rights, and artist credits will stay unchanged."}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={analyzing || replacing}
              onChange={(event) =>
                void selectFile(event.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={analyzing || replacing}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              <AudioFileIcon size={15} />
              Choose Audio
            </button>

            <div className="min-w-0 text-xs text-[var(--text-muted)]">
              {analyzing
                ? "Analyzing audio..."
                : file
                  ? `${file.name} · ${formatDuration(duration)}`
                  : "No replacement file selected"}
            </div>
          </div>

          {error ? (
            <div className="text-xs text-[var(--status-error,#dc584f)]">{error}</div>
          ) : null}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void replaceAudio()}
          disabled={!file || analyzing || replacing}
          className="filmwave-backend-button filmwave-backend-button-primary"
        >
          {replacing ? "Replacing..." : "Replace Audio"}
        </button>
      </div>
    </div>
  );
}
