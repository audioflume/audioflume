"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/lib/types";
import ModalShell from "@/components/ModalShell";
import DownloadIcon from "@/components/icons/DownloadIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";

const LENGTH_OPTIONS = [
  { label: "15 seconds", shortLabel: "15s", seconds: 15 },
  { label: "30 seconds", shortLabel: "30s", seconds: 30 },
  { label: "1 minute", shortLabel: "1m", seconds: 60 },
];

const WAVEFORM_PEAK_COUNT = 512;
const PLAYER_PREVIEW_Z_INDEX = "220";
const BAR_BEATS = 4;

type ShortenedTrack = {
  id: string;
  label: string;
  durationSeconds: number;
  actualDurationSeconds: number;
  url: string;
  song: Song;
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

type EnergyFrame = {
  time: number;
  rms: number;
};

type BeatGrid = {
  beats: number[];
  downbeats: number[];
};

type EditPointsWithBeatGrid = {
  beats?: unknown;
  downbeats?: unknown;
};

type ContinuousExcerptPlan = {
  start: number;
  length: number;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "filmwave-short-track";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cleanNumberArray(value: unknown, duration: number) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 0 && item <= duration)
    .sort((a, b) => a - b);
}

function createBpmBeatGrid(bpm: number, duration: number): BeatGrid | null {
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const beatInterval = 60 / bpm;
  const beats: number[] = [];
  const downbeats: number[] = [];

  for (let index = 0; index * beatInterval <= duration; index += 1) {
    const time = Number((index * beatInterval).toFixed(4));
    beats.push(time);

    if (index % BAR_BEATS === 0) {
      downbeats.push(time);
    }
  }

  return { beats, downbeats };
}

function getBeatGridFromSong(song: Song, duration: number): BeatGrid | null {
  try {
    const parsed = JSON.parse(song.editPoints || "{}") as EditPointsWithBeatGrid;
    const beats = cleanNumberArray(parsed.beats, duration);
    const downbeats = cleanNumberArray(parsed.downbeats, duration);

    if (beats.length >= 4 || downbeats.length >= 2) {
      const usableBeats = beats.length >= 4 ? beats : downbeats;

      return {
        beats: usableBeats,
        downbeats: downbeats.length >= 2 ? downbeats : usableBeats.filter((_, index) => index % BAR_BEATS === 0),
      };
    }
  } catch {
    // Fall back to BPM-derived grid.
  }

  return createBpmBeatGrid(song.bpm, duration);
}

function getCutGrid(beatGrid: BeatGrid | null) {
  if (!beatGrid) return [];
  return beatGrid.downbeats.length >= 2 ? beatGrid.downbeats : beatGrid.beats;
}

function getCandidateStarts(minStart: number, maxStart: number, grid: number[], step: number) {
  const candidates: number[] = [];

  for (const time of grid) {
    if (time >= minStart && time <= maxStart) candidates.push(time);
  }

  for (let start = minStart; start <= maxStart; start += step) {
    candidates.push(start);
  }

  return Array.from(new Set(candidates.map((candidate) => Number(candidate.toFixed(3))))).sort((a, b) => a - b);
}

function getFlexibleDurationMargin(targetSeconds: number) {
  if (targetSeconds <= 15) return 2;
  if (targetSeconds <= 30) return 3;
  return 5;
}

function getCandidateLengths(targetSeconds: number, duration: number) {
  const margin = getFlexibleDurationMargin(targetSeconds);
  const minLength = Math.max(4, Math.min(duration, targetSeconds - margin));
  const maxLength = Math.min(duration, targetSeconds + margin);
  const lengths: number[] = [Math.min(targetSeconds, duration)];

  for (let length = minLength; length <= maxLength; length += 0.5) {
    lengths.push(length);
  }

  return Array.from(new Set(lengths.map((length) => Number(length.toFixed(3))))).sort((a, b) => a - b);
}

function getNearestGridDistance(time: number, grid: number[]) {
  if (!grid.length) return Infinity;

  let distance = Infinity;

  for (const gridTime of grid) {
    distance = Math.min(distance, Math.abs(gridTime - time));
  }

  return distance;
}

function getMonoSample(channels: Float32Array[], frame: number) {
  let value = 0;

  for (let channel = 0; channel < channels.length; channel += 1) {
    value += channels[channel][frame] || 0;
  }

  return value / Math.max(1, channels.length);
}

function getEnergyFrames(buffer: AudioBuffer) {
  const windowFrames = Math.max(1, Math.floor(buffer.sampleRate * 0.25));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  const frames: EnergyFrame[] = [];

  for (let startFrame = 0; startFrame < buffer.length; startFrame += windowFrames) {
    const endFrame = Math.min(buffer.length, startFrame + windowFrames);
    let sum = 0;
    let count = 0;

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const value = getMonoSample(channels, frame);
      sum += value * value;
      count += 1;
    }

    frames.push({
      time: startFrame / buffer.sampleRate,
      rms: count > 0 ? Math.sqrt(sum / count) : 0,
    });
  }

  return frames;
}

function averageEnergy(frames: EnergyFrame[], start: number, end: number) {
  const scoped = frames.filter((frame) => frame.time >= start && frame.time < end);
  if (!scoped.length) return 0;
  return scoped.reduce((sum, frame) => sum + frame.rms, 0) / scoped.length;
}

function edgeEnergy(frames: EnergyFrame[], start: number, end: number) {
  const edgeSeconds = Math.min(1.5, Math.max(0.5, (end - start) * 0.12));
  const startEnergy = averageEnergy(frames, start, start + edgeSeconds);
  const endEnergy = averageEnergy(frames, end - edgeSeconds, end);

  return { startEnergy, endEnergy };
}

function findBestContinuousExcerpt({
  buffer,
  frames,
  targetSeconds,
  beatGrid,
}: {
  buffer: AudioBuffer;
  frames: EnergyFrame[];
  targetSeconds: number;
  beatGrid: BeatGrid | null;
}): ContinuousExcerptPlan {
  const duration = buffer.duration;
  const grid = getCutGrid(beatGrid);
  const lengthCandidates = getCandidateLengths(targetSeconds, duration);
  const durationMargin = getFlexibleDurationMargin(targetSeconds);
  let bestPlan: ContinuousExcerptPlan = {
    start: 0,
    length: Math.min(targetSeconds, duration),
  };
  let bestScore = -Infinity;

  for (const length of lengthCandidates) {
    const maxStart = Math.max(0, duration - length);
    const searchMin = duration > length + 12 ? Math.min(maxStart, duration * 0.08) : 0;
    const searchMax = duration > length + 12 ? Math.max(searchMin, duration - length - duration * 0.04) : maxStart;
    const baseCandidates = getCandidateStarts(searchMin, searchMax, grid, 0.5);
    const phraseEndCandidates = grid
      .map((time) => time - length)
      .filter((start) => start >= searchMin && start <= searchMax);
    const anchorCandidates = [
      0,
      maxStart,
      duration * 0.18,
      duration * 0.32,
      duration * 0.48,
      duration * 0.64,
    ].map((start) => clamp(start, searchMin, searchMax));
    const candidates = Array.from(
      new Set([...baseCandidates, ...phraseEndCandidates, ...anchorCandidates].map((candidate) => Number(candidate.toFixed(3)))),
    ).sort((a, b) => a - b);

    for (const start of candidates) {
      const safeStart = clamp(start, searchMin, searchMax);
      const end = safeStart + length;
      const middleEnergy = averageEnergy(frames, safeStart, end);
      const energyBase = Math.max(0.0001, middleEnergy);
      const { startEnergy, endEnergy } = edgeEnergy(frames, safeStart, end);
      const beforeStartEnergy = averageEnergy(frames, Math.max(0, safeStart - 2), safeStart) || startEnergy;
      const afterEndEnergy = averageEnergy(frames, end, Math.min(duration, end + 2.25)) || endEnergy;
      const maxStartForLength = Math.max(0, duration - length);
      const timelinePosition = maxStartForLength > 0 ? safeStart / maxStartForLength : 0;
      const timelineBias = (1 - Math.abs(timelinePosition - 0.58)) * middleEnergy * 0.08;
      const startGridDistance = getNearestGridDistance(safeStart, grid);
      const endGridDistance = getNearestGridDistance(end, grid);
      const startBoundaryBonus = Number.isFinite(startGridDistance)
        ? Math.max(0, 1 - startGridDistance / 1.5) * middleEnergy * 0.2
        : 0;
      const endBoundaryBonus = Number.isFinite(endGridDistance)
        ? Math.max(0, 1 - endGridDistance / 1.5) * middleEnergy * 0.42
        : 0;
      const startIntent = clamp((middleEnergy - Math.max(startEnergy, beforeStartEnergy * 0.75)) / energyBase, -1, 1);
      const endResolution = clamp((middleEnergy - Math.max(endEnergy, afterEndEnergy * 0.85)) / energyBase, -1, 1);
      const realSongEndBonus = Math.abs(end - duration) < 0.75 ? middleEnergy * 0.42 : 0;
      const lengthDeviation = Math.abs(length - targetSeconds);
      const lengthPenalty = (lengthDeviation / Math.max(1, durationMargin)) * middleEnergy * 0.2;
      const abruptStartPenalty = Math.max(0, startEnergy - middleEnergy * 1.15) * 0.35;
      const abruptEndPenalty = Math.max(0, Math.max(endEnergy, afterEndEnergy) - middleEnergy * 1.05) * 0.7;
      const score =
        middleEnergy +
        startIntent * middleEnergy * 0.28 +
        endResolution * middleEnergy * 0.62 +
        startBoundaryBonus +
        endBoundaryBonus +
        realSongEndBonus +
        timelineBias -
        lengthPenalty -
        abruptStartPenalty -
        abruptEndPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestPlan = {
          start: safeStart,
          length,
        };
      }
    }
  }

  return {
    start: clamp(bestPlan.start, 0, Math.max(0, duration - bestPlan.length)),
    length: Math.min(bestPlan.length, duration),
  };
}

function copyContinuousExcerpt({
  source,
  output,
  startSeconds,
}: {
  source: AudioBuffer;
  output: AudioBuffer;
  startSeconds: number;
}) {
  const sampleRate = source.sampleRate;
  const sourceStartFrame = Math.max(0, Math.floor(startSeconds * sampleRate));

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const sourceData = source.getChannelData(channel);
    const outputData = output.getChannelData(channel);

    for (let frame = 0; frame < output.length; frame += 1) {
      const sourceFrame = sourceStartFrame + frame;
      outputData[frame] = sourceFrame < source.length ? sourceData[sourceFrame] || 0 : 0;
    }
  }
}

function applyEdgeFades(buffer: AudioBuffer) {
  const fadeInFrames = Math.min(Math.floor(buffer.sampleRate * 0.06), Math.floor(buffer.length / 4));
  const fadeOutSeconds = clamp(buffer.duration * 0.06, 1, 2);
  const fadeOutFrames = Math.min(Math.floor(buffer.sampleRate * fadeOutSeconds), Math.floor(buffer.length / 3));

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);

    for (let index = 0; index < fadeInFrames; index += 1) {
      data[index] *= Math.sin((index / Math.max(1, fadeInFrames)) * Math.PI * 0.5);
    }

    for (let index = 0; index < fadeOutFrames; index += 1) {
      const frame = data.length - 1 - index;
      data[frame] *= Math.sin((index / Math.max(1, fadeOutFrames)) * Math.PI * 0.5);
    }
  }
}

function renderNaturalShort(buffer: AudioBuffer, audioContext: AudioContext, targetSeconds: number, song: Song) {
  const frames = getEnergyFrames(buffer);
  const beatGrid = getBeatGridFromSong(song, buffer.duration);
  const plan = findBestContinuousExcerpt({
    buffer,
    frames,
    targetSeconds,
    beatGrid,
  });
  const output = audioContext.createBuffer(
    buffer.numberOfChannels,
    Math.max(1, Math.floor(plan.length * buffer.sampleRate)),
    buffer.sampleRate,
  );

  console.info("[Filmwave Shorten] Flexible continuous excerpt plan", {
    mode: "flexible_continuous_excerpt_deliberate_end",
    beatAware: Boolean(beatGrid),
    targetSeconds,
    start: plan.start,
    end: plan.start + plan.length,
    length: plan.length,
  });

  copyContinuousExcerpt({ source: buffer, output, startSeconds: plan.start });
  applyEdgeFades(output);

  return output;
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

  return new Blob([wavBuffer], { type: "audio/wav" });
}

function createWaveformPeaks(buffer: AudioBuffer) {
  const peakCount = Math.min(WAVEFORM_PEAK_COUNT, Math.max(1, buffer.length));
  const samplesPerPeak = Math.max(1, Math.floor(buffer.length / peakCount));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  const peaks: number[] = [];
  let maxPeak = 0;

  for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
    const start = peakIndex * samplesPerPeak;
    const end = Math.min(buffer.length, start + samplesPerPeak);
    let peak = 0;

    for (let frame = start; frame < end; frame += 1) {
      for (let channel = 0; channel < channels.length; channel += 1) {
        const value = Math.abs(channels[channel][frame] || 0);
        if (value > peak) peak = value;
      }
    }

    if (peak > maxPeak) maxPeak = peak;
    peaks.push(peak);
  }

  if (maxPeak <= 0) return peaks.map(() => 0);
  return peaks.map((peak) => Number((peak / maxPeak).toFixed(4)));
}

async function createShortenedTrack(song: Song, targetSeconds: number) {
  const AudioContextConstructor =
    window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("Your browser does not support in-browser audio processing.");
  }

  let response: Response;

  try {
    response = await fetch(
      `/api/songs/${encodeURIComponent(song.id)}/shorten-source`,
    );
  } catch {
    throw new Error("Could not load the track audio.");
  }

  if (!response.ok) {
    let message = "Could not load the track audio.";

    try {
      const data = await response.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // Keep the fallback message.
    }

    throw new Error(message);
  }

  const encodedAudio = await response.arrayBuffer();
  const audioContext = new AudioContextConstructor();

  try {
    const decodedAudio = await audioContext.decodeAudioData(encodedAudio.slice(0));
    const shortenedBuffer = renderNaturalShort(decodedAudio, audioContext, targetSeconds, song);
    const blob = audioBufferToWavBlob(shortenedBuffer);

    return {
      blob,
      actualDurationSeconds: shortenedBuffer.duration,
      waveformPeaks: createWaveformPeaks(shortenedBuffer),
    };
  } finally {
    void audioContext.close();
  }
}

function LoadingSpinner() {
  return (
    <span
      className="h-3 w-3 animate-spin rounded-full border border-[var(--text-primary)] border-t-transparent"
      aria-hidden="true"
    />
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PreviewButton({
  playing,
  progress,
  label,
  onClick,
}: {
  playing: boolean;
  progress: number;
  label: string;
  onClick: () => void;
}) {
  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const progressDegrees = `${safeProgress * 360}deg`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#111] transition hover:scale-[1.04]"
    >
      <span
        className="absolute inset-0 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
        style={{
          background: `conic-gradient(#111 ${progressDegrees}, rgba(255,255,255,0.5) 0deg)`,
        }}
        aria-hidden="true"
      />
      <span className="absolute inset-[3px] rounded-full bg-white/95 shadow-[0_1px_5px_rgba(0,0,0,0.22)]" aria-hidden="true" />
      <span className="relative z-10 flex items-center justify-center">
        <PlayPauseIcon playing={playing} />
      </span>
    </button>
  );
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
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();
  const [generatedTracks, setGeneratedTracks] = useState<ShortenedTrack[]>([]);
  const [generatingSeconds, setGeneratingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePreviewTrackId, setActivePreviewTrackId] = useState<string | null>(null);
  const [completedPreviewTrackIds, setCompletedPreviewTrackIds] = useState<Set<string>>(() => new Set());
  const isShortenedPreviewActive =
    isOpen &&
    isPlaying &&
    generatedTracks.some((track) => track.id === currentSong?.id);

  useEffect(() => {
    if (!isShortenedPreviewActive) return;

    const player = document.querySelector<HTMLElement>(".filmwave-music-player");
    if (!player) return;

    const previousZIndex = player.style.zIndex;
    player.style.zIndex = PLAYER_PREVIEW_Z_INDEX;

    return () => {
      player.style.zIndex = previousZIndex;
    };
  }, [isShortenedPreviewActive, generatedTracks, currentSong?.id, isPlaying, isOpen]);

  useEffect(() => {
    if (!activePreviewTrackId) return;
    if (currentSong?.id !== activePreviewTrackId) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (currentTime < duration - 0.12) return;

    setCompletedPreviewTrackIds((current) => {
      const next = new Set(current);
      next.add(activePreviewTrackId);
      return next;
    });
    setActivePreviewTrackId(null);
  }, [activePreviewTrackId, currentSong?.id, currentTime, duration]);

  async function handleGenerate(targetSeconds: number) {
    if (!song || generatingSeconds !== null) return;

    setGeneratingSeconds(targetSeconds);
    setError(null);

    try {
      const { blob, actualDurationSeconds, waveformPeaks } = await createShortenedTrack(song, targetSeconds);
      const url = URL.createObjectURL(blob);
      const lengthOption = LENGTH_OPTIONS.find((option) => option.seconds === targetSeconds);
      const label = lengthOption?.label || formatDuration(targetSeconds);
      const shortLabel = lengthOption?.shortLabel || formatDuration(targetSeconds);
      const generatedId = `${song.id}-short-${targetSeconds}-${Date.now()}`;
      const shortenedSong: Song = {
        ...song,
        id: generatedId,
        title: `${song.title} (${shortLabel} Short)`,
        audioUrl: url,
        playbackUrl: url,
        hlsUrl: "",
        stems: [],
        waveformPeaks: JSON.stringify(waveformPeaks),
        duration: actualDurationSeconds,
        editPoints: "",
        downloadCount: 0,
        sizeBytes: blob.size,
      };
      const track: ShortenedTrack = {
        id: generatedId,
        label,
        durationSeconds: targetSeconds,
        actualDurationSeconds,
        url,
        song: shortenedSong,
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

  function handlePreview(track: ShortenedTrack) {
    setActivePreviewTrackId(track.id);
    setCompletedPreviewTrackIds((current) => {
      const next = new Set(current);
      next.delete(track.id);
      return next;
    });
    togglePlayPause(track.song);
  }

  if (!song) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      title="Shorten Track"
      onClose={onClose}
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
              Generate a shorter version by isolating one usable continuous section with a more deliberate start or ending.
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
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner />
                        <span>Creating...</span>
                      </span>
                    ) : (
                      option.shortLabel
                    )}
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
                  const isActive = currentSong?.id === track.id;
                  const isPreviewing = isActive && isPlaying;
                  const isCompleted = completedPreviewTrackIds.has(track.id);
                  const shouldPersistPreview = activePreviewTrackId === track.id && isActive && !isCompleted;
                  const previewProgress =
                    isActive && duration > 0 && Number.isFinite(duration)
                      ? currentTime / duration
                      : 0;
                  const cover = typeof track.song.coverArt === "string" && track.song.coverArt.trim()
                    ? track.song.coverArt
                    : null;
                  const shortLabel = LENGTH_OPTIONS.find((option) => option.seconds === track.durationSeconds)?.shortLabel ||
                    formatDuration(track.durationSeconds);
                  const downloadName = `${sanitizeFileName(song.title)}-${shortLabel}-short.wav`;

                  return (
                    <div
                      key={track.id}
                      className="group flex min-h-[52px] items-center gap-3 bg-[var(--bg-primary)] p-2"
                    >
                      <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-none bg-[var(--bg-tertiary-hover)] text-[var(--text-primary)]">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                            <PlaylistIcon size={16} />
                          </span>
                        )}

                        <span
                          className={`absolute inset-0 flex items-center justify-center bg-black/35 transition-opacity ${shouldPersistPreview ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        >
                          <PreviewButton
                            playing={isPreviewing}
                            progress={previewProgress}
                            label={isPreviewing ? `Pause ${track.label} version` : `Preview ${track.label} version`}
                            onClick={() => handlePreview(track)}
                          />
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                          {track.label} Version
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {formatDuration(track.actualDurationSeconds)} deliberate excerpt · waveform ready
                        </span>
                      </span>

                      <a
                        href={track.url}
                        download={downloadName}
                        aria-label={`Download ${track.label} version`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DownloadIcon size={17} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
