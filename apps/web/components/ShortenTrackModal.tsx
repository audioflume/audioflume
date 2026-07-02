"use client";

import { useEffect, useRef, useState } from "react";
import type { Song } from "@/lib/types";
import ModalShell from "@/components/ModalShell";
import PlaylistIcon from "@/components/icons/PlaylistIcon";

const LENGTH_OPTIONS = [
  { label: "15 seconds", shortLabel: "15s", seconds: 15 },
  { label: "30 seconds", shortLabel: "30s", seconds: 30 },
  { label: "1 minute", shortLabel: "1m", seconds: 60 },
];

type ShortenedTrack = {
  id: string;
  label: string;
  durationSeconds: number;
  actualDurationSeconds: number;
  url: string;
};

type ShortenTrackModalProps = {
  isOpen: boolean;
  song: Song | null;
  onClose: () => void;
};

type BrowserAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer) {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);
  const channelData = Array.from({ length: numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel),
  );

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;

  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function applyEdgeFades(buffer: AudioBuffer) {
  const fadeInFrames = Math.min(Math.floor(buffer.sampleRate * 0.03), Math.floor(buffer.length / 4));
  const fadeOutFrames = Math.min(Math.floor(buffer.sampleRate * 1.75), Math.floor(buffer.length / 3));

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);

    for (let index = 0; index < fadeInFrames; index += 1) {
      data[index] *= index / fadeInFrames;
    }

    for (let index = 0; index < fadeOutFrames; index += 1) {
      const frame = data.length - 1 - index;
      data[frame] *= index / fadeOutFrames;
    }
  }
}

async function createShortenedTrack(song: Song, targetSeconds: number) {
  const AudioContextConstructor =
    window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("Your browser does not support in-browser audio processing.");
  }

  const response = await fetch(
    `/api/songs/${encodeURIComponent(song.id)}/shorten-source`,
  );

  if (!response.ok) {
    let message = "Could not load the track audio.";

    try {
      const data = await response.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // Use the fallback message when the server returns audio or an empty body.
    }

    throw new Error(message);
  }

  const encodedAudio = await response.arrayBuffer();
  const audioContext = new AudioContextConstructor();

  try {
    const decodedAudio = await audioContext.decodeAudioData(encodedAudio.slice(0));
    const actualDurationSeconds = Math.min(targetSeconds, decodedAudio.duration);
    const frameCount = Math.max(1, Math.floor(actualDurationSeconds * decodedAudio.sampleRate));
    const shortenedBuffer = audioContext.createBuffer(
      decodedAudio.numberOfChannels,
      frameCount,
      decodedAudio.sampleRate,
    );

    for (let channel = 0; channel < decodedAudio.numberOfChannels; channel += 1) {
      const sourceData = decodedAudio.getChannelData(channel);
      const outputData = shortenedBuffer.getChannelData(channel);

      outputData.set(sourceData.subarray(0, frameCount));
    }

    applyEdgeFades(shortenedBuffer);

    return {
      blob: audioBufferToWavBlob(shortenedBuffer),
      actualDurationSeconds,
    };
  } finally {
    void audioContext.close();
  }
}

function SongPreview({ song }: { song: Song }) {
  const cover = typeof song.coverArt === "string" && song.coverArt.trim() ? song.coverArt : null;

  return (
    <div className="flex flex-shrink-0 items-center justify-center px-5 pb-4 pt-0 text-center">
      <div className="flex min-w-0 items-center justify-center gap-2">
        <span className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-none bg-[var(--bg-secondary)]">
          {cover ? (
            <img src={cover} alt={song.title} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
              <PlaylistIcon size={10} />
            </span>
          )}
        </span>

        <span className="block max-w-[300px] truncate text-[12px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
          {song.title} by {song.artist}
        </span>
      </div>
    </div>
  );
}

export default function ShortenTrackModal({
  isOpen,
  song,
  onClose,
}: ShortenTrackModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generatedTracksRef = useRef<ShortenedTrack[]>([]);
  const [generatedTracks, setGeneratedTracks] = useState<ShortenedTrack[]>([]);
  const [generatingSeconds, setGeneratingSeconds] = useState<number | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generatedTracksRef.current = generatedTracks;
  }, [generatedTracks]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      generatedTracksRef.current.forEach((track) => URL.revokeObjectURL(track.url));
    };
  }, []);

  function handleClose() {
    audioRef.current?.pause();
    setPreviewingId(null);
    onClose();
  }

  async function handleGenerate(targetSeconds: number) {
    if (!song || generatingSeconds !== null) return;

    setGeneratingSeconds(targetSeconds);
    setError(null);

    try {
      const { blob, actualDurationSeconds } = await createShortenedTrack(song, targetSeconds);
      const url = URL.createObjectURL(blob);
      const label = LENGTH_OPTIONS.find((option) => option.seconds === targetSeconds)?.label ||
        formatDuration(targetSeconds);
      const track: ShortenedTrack = {
        id: `${song.id}-${targetSeconds}`,
        label,
        durationSeconds: targetSeconds,
        actualDurationSeconds,
        url,
      };

      setGeneratedTracks((current) => {
        const replaced = current.filter((existing) => existing.durationSeconds === targetSeconds);
        const remaining = current.filter((existing) => existing.durationSeconds !== targetSeconds);

        replaced.forEach((existing) => URL.revokeObjectURL(existing.url));

        return [track, ...remaining].sort((a, b) => a.durationSeconds - b.durationSeconds);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to shorten track.");
    } finally {
      setGeneratingSeconds(null);
    }
  }

  async function handlePreview(track: ShortenedTrack) {
    const audio = audioRef.current;

    if (!audio) return;

    if (previewingId === track.id && !audio.paused) {
      audio.pause();
      setPreviewingId(null);
      return;
    }

    try {
      audio.pause();
      audio.src = track.url;
      audio.currentTime = 0;
      await audio.play();
      setPreviewingId(track.id);
    } catch (err) {
      setPreviewingId(null);
      setError(err instanceof Error ? err.message : "Could not preview shortened track.");
    }
  }

  if (!song) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      title="Shorten Track"
      onClose={handleClose}
      closeLabel="Close shorten track modal"
      maxWidth="max-w-[430px]"
      maxHeight="520px"
      centerTitle
      bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-0"
      contentClassName="max-h-[calc(100vh-64px)] [&>div:first-child]:h-[58px] [&>div:first-child]:items-end [&>div:first-child]:pb-2"
    >
      <SongPreview song={song} />

      <div className="-mx-5 flex min-h-0 flex-1 flex-col border-t border-[var(--filmwave-menu-sep)] bg-[var(--filmwave-menu-bg)]">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="text-center text-xs leading-5 text-[var(--text-secondary)]">
              Choose a shorter version to generate. The track is processed in your browser and appears below when it is ready.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {LENGTH_OPTIONS.map((option) => {
                const isGenerating = generatingSeconds === option.seconds;
                const disabled =
                  generatingSeconds !== null ||
                  (Number.isFinite(song.duration) && song.duration > 0 && song.duration <= option.seconds);

                return (
                  <button
                    key={option.seconds}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleGenerate(option.seconds)}
                    className="flex h-12 items-center justify-center rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40"
                  >
                    {isGenerating ? "Creating..." : option.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-none border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-center text-xs font-medium text-[var(--danger)]">
              {error}
            </div>
          )}

          <div className="border-t border-[var(--filmwave-menu-sep)] pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Short Options
              </h3>
              {generatedTracks.length > 0 && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {generatedTracks.length} ready
                </span>
              )}
            </div>

            {generatedTracks.length === 0 ? (
              <div className="flex min-h-[92px] items-center justify-center border border-dashed border-[var(--border)] px-4 text-center text-xs leading-5 text-[var(--text-secondary)]">
                Generated short versions will appear here for preview.
              </div>
            ) : (
              <div className="space-y-1">
                {generatedTracks.map((track) => {
                  const isPreviewing = previewingId === track.id;

                  return (
                    <div
                      key={track.id}
                      className="flex min-h-[52px] items-center gap-3 bg-[var(--bg-primary)] p-2"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[var(--bg-tertiary-hover)] text-xs font-semibold text-[var(--text-primary)]">
                        {LENGTH_OPTIONS.find((option) => option.seconds === track.durationSeconds)?.shortLabel ||
                          formatDuration(track.durationSeconds)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                          {track.label} Version
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {formatDuration(track.actualDurationSeconds)} preview
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handlePreview(track)}
                        className="h-8 rounded-none border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                      >
                        {isPreviewing ? "Pause" : "Preview"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setPreviewingId(null)}
        onPause={() => {
          if (audioRef.current?.ended) setPreviewingId(null);
        }}
      />
    </ModalShell>
  );
}
