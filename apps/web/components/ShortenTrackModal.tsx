"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/lib/types";
import ModalShell from "@/components/ModalShell";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import { getMarkerType, parseEditPoints } from "@filmwave/shared";

const LENGTH_OPTIONS = [
  { label: "15 seconds", shortLabel: "15s", seconds: 15 },
  { label: "30 seconds", shortLabel: "30s", seconds: 30 },
  { label: "1 minute", shortLabel: "1m", seconds: 60 },
];

const WAVEFORM_PEAK_COUNT = 512;
const PLAYER_PREVIEW_Z_INDEX = "220";

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

type CutSegment = {
  start: number;
  end: number;
};

type EnergyWindow = {
  time: number;
  rms: number;
  flux: number;
};

type StructureAnchors = {
  firstHit: number | null;
  drop: number | null;
  breakPoint: number | null;
  buttonEnding: number | null;
  hook: number | null;
  gridAnchor: number;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
      data[index] *= index / Math.max(1, fadeInFrames);
    }

    for (let index = 0; index < fadeOutFrames; index += 1) {
      const frame = data.length - 1 - index;
      data[frame] *= index / Math.max(1, fadeOutFrames);
    }
  }
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

function getMarkerTime(song: Song, type: string) {
  const markers = parseEditPoints(song.editPoints).markers || [];
  const marker = markers.find((item) => getMarkerType(item) === type);
  const time = Number(marker?.time);

  return Number.isFinite(time) ? time : null;
}

function getEnergyWindows(source: AudioBuffer): EnergyWindow[] {
  const windowSeconds = 0.5;
  const windowFrames = Math.max(1, Math.floor(windowSeconds * source.sampleRate));
  const channels = Array.from({ length: source.numberOfChannels }, (_, channel) =>
    source.getChannelData(channel),
  );
  const windows: EnergyWindow[] = [];
  let previousRms = 0;

  for (let startFrame = 0; startFrame < source.length; startFrame += windowFrames) {
    const endFrame = Math.min(source.length, startFrame + windowFrames);
    let sum = 0;
    let count = 0;

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      for (let channel = 0; channel < channels.length; channel += 1) {
        const value = channels[channel][frame] || 0;
        sum += value * value;
        count += 1;
      }
    }

    const rms = count > 0 ? Math.sqrt(sum / count) : 0;
    windows.push({
      time: startFrame / source.sampleRate,
      rms,
      flux: Math.max(0, rms - previousRms),
    });
    previousRms = rms;
  }

  return windows;
}

function findBestSustainedEnergyStart({
  windows,
  minStart,
  maxStart,
  length,
  preferLater = false,
}: {
  windows: EnergyWindow[];
  minStart: number;
  maxStart: number;
  length: number;
  preferLater?: boolean;
}) {
  if (maxStart <= minStart) return null;

  let bestStart = minStart;
  let bestScore = -Infinity;
  const step = 0.5;

  for (let start = minStart; start <= maxStart; start += step) {
    const end = start + length;
    const scoped = windows.filter((window) => window.time >= start && window.time < end);
    if (!scoped.length) continue;

    const averageEnergy = scoped.reduce((sum, window) => sum + window.rms, 0) / scoped.length;
    const averageFlux = scoped.reduce((sum, window) => sum + window.flux, 0) / scoped.length;
    const timelineBias = preferLater ? (start - minStart) / Math.max(1, maxStart - minStart) : 0;
    const score = averageEnergy * 0.88 + averageFlux * 0.12 + timelineBias * averageEnergy * 0.08;

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return Number.isFinite(bestScore) ? bestStart : null;
}

function getBarSeconds(song: Song) {
  const bpm = Number(song.bpm);

  if (!Number.isFinite(bpm) || bpm < 45 || bpm > 220) return 2;

  return (60 / bpm) * 4;
}

function getPhraseSeconds(song: Song) {
  return clamp(getBarSeconds(song) * 4, 5.5, 12);
}

function snapToBarGrid({
  song,
  time,
  duration,
  gridAnchor,
}: {
  song: Song;
  time: number;
  duration: number;
  gridAnchor: number;
}) {
  const bar = getBarSeconds(song);
  const snapped = gridAnchor + Math.round((time - gridAnchor) / bar) * bar;
  const snapLimit = Math.min(1.4, bar * 0.45);

  if (Math.abs(snapped - time) > snapLimit) {
    return clamp(time, 0, duration);
  }

  return clamp(snapped, 0, duration);
}

function getStructureAnchors(song: Song, source: AudioBuffer, windows: EnergyWindow[]): StructureAnchors {
  const firstHit = getMarkerTime(song, "first_hit");
  const drop = getMarkerTime(song, "drop");
  const breakPoint = getMarkerTime(song, "break");
  const buttonEnding = getMarkerTime(song, "button_ending");
  const fallbackHookStart = findBestSustainedEnergyStart({
    windows,
    minStart: clamp(source.duration * 0.16, 4, Math.max(4, source.duration - 8)),
    maxStart: clamp(source.duration * 0.72, 4, Math.max(4, source.duration - 8)),
    length: Math.min(12, Math.max(6, source.duration * 0.12)),
    preferLater: false,
  });
  const hook = drop ?? firstHit ?? breakPoint ?? fallbackHookStart;
  const gridAnchor = firstHit ?? drop ?? 0;

  return {
    firstHit,
    drop,
    breakPoint,
    buttonEnding,
    hook,
    gridAnchor,
  };
}

function makeFixedSegment(start: number, length: number, duration: number): CutSegment {
  const safeLength = Math.min(length, duration);
  const safeStart = clamp(start, 0, Math.max(0, duration - safeLength));

  return {
    start: safeStart,
    end: safeStart + safeLength,
  };
}

function getCutdownShape(targetSeconds: number, crossfadeSeconds: number) {
  const openingLength = targetSeconds <= 20 ? 2.25 : targetSeconds <= 35 ? 4 : 7.5;
  const hookLength = targetSeconds <= 20 ? 8.75 : targetSeconds <= 35 ? 18 : 38;
  const endingLength = Math.max(
    targetSeconds <= 20 ? 4 : targetSeconds <= 35 ? 8 : 13,
    targetSeconds + crossfadeSeconds * 2 - openingLength - hookLength,
  );

  return {
    openingLength,
    hookLength,
    endingLength,
  };
}

function getOpeningSegment({
  song,
  source,
  anchors,
  length,
}: {
  song: Song;
  source: AudioBuffer;
  anchors: StructureAnchors;
  length: number;
}) {
  const phrase = getPhraseSeconds(song);
  const shouldSkipLongIntro = anchors.firstHit !== null && anchors.firstHit > phrase;
  const rawStart = shouldSkipLongIntro ? anchors.firstHit - Math.min(1.25, length * 0.45) : 0;
  const start = shouldSkipLongIntro
    ? snapToBarGrid({ song, time: rawStart, duration: source.duration, gridAnchor: anchors.gridAnchor })
    : 0;

  return makeFixedSegment(start, length, source.duration);
}

function getHookSegment({
  song,
  source,
  anchors,
  windows,
  length,
  minStart,
  maxEnd,
}: {
  song: Song;
  source: AudioBuffer;
  anchors: StructureAnchors;
  windows: EnergyWindow[];
  length: number;
  minStart: number;
  maxEnd: number;
}) {
  const phrase = getPhraseSeconds(song);
  const leadIn = Math.min(phrase * 0.45, length * 0.26, 4.5);
  const maxStart = Math.max(minStart, maxEnd - length);
  const markerStart = anchors.hook !== null
    ? anchors.hook - leadIn
    : null;
  const fallbackStart = findBestSustainedEnergyStart({
    windows,
    minStart,
    maxStart,
    length,
    preferLater: false,
  });
  const rawStart = markerStart ?? fallbackStart ?? minStart;
  const snappedStart = snapToBarGrid({
    song,
    time: rawStart,
    duration: source.duration,
    gridAnchor: anchors.gridAnchor,
  });
  const start = clamp(snappedStart, minStart, maxStart);

  return makeFixedSegment(start, length, source.duration);
}

function getEndingSegment({
  song,
  source,
  anchors,
  windows,
  length,
  minStart,
}: {
  song: Song;
  source: AudioBuffer;
  anchors: StructureAnchors;
  windows: EnergyWindow[];
  length: number;
  minStart: number;
}) {
  const duration = source.duration;
  const maxStart = Math.max(minStart, duration - length);
  const tailHitLead = Math.min(2.25, length * 0.25);
  const markerStart = anchors.buttonEnding !== null
    ? anchors.buttonEnding - (length - tailHitLead)
    : null;
  const fallbackStart = findBestSustainedEnergyStart({
    windows,
    minStart: clamp(Math.max(minStart, duration - 45), 0, maxStart),
    maxStart,
    length,
    preferLater: true,
  });
  const rawStart = markerStart ?? fallbackStart ?? duration - length;
  const snappedStart = snapToBarGrid({
    song,
    time: rawStart,
    duration,
    gridAnchor: anchors.gridAnchor,
  });
  const start = clamp(snappedStart, minStart, maxStart);

  return makeFixedSegment(start, length, duration);
}

function buildCutdownSegments(song: Song, source: AudioBuffer, targetSeconds: number, crossfadeSeconds: number) {
  const duration = source.duration;
  const safeTarget = Math.min(targetSeconds, duration);
  const windows = getEnergyWindows(source);

  if (duration <= safeTarget + 1) {
    return [{ start: 0, end: safeTarget }];
  }

  const anchors = getStructureAnchors(song, source, windows);
  const { openingLength, hookLength, endingLength } = getCutdownShape(safeTarget, crossfadeSeconds);
  const outputTotalSourceSeconds = safeTarget + crossfadeSeconds * 2;
  const adjustedEndingLength = Math.max(3.5, endingLength);
  const adjustedHookLength = Math.max(
    4,
    outputTotalSourceSeconds - openingLength - adjustedEndingLength,
  );
  const openingSegment = getOpeningSegment({
    song,
    source,
    anchors,
    length: openingLength,
  });
  const endingSegment = getEndingSegment({
    song,
    source,
    anchors,
    windows,
    length: adjustedEndingLength,
    minStart: openingSegment.end + Math.max(2, getBarSeconds(song)),
  });
  const hookSegment = getHookSegment({
    song,
    source,
    anchors,
    windows,
    length: Math.min(hookLength, adjustedHookLength),
    minStart: openingSegment.end + Math.max(1, getBarSeconds(song) * 0.5),
    maxEnd: endingSegment.start - Math.max(1, getBarSeconds(song) * 0.5),
  });

  if (hookSegment.end > openingSegment.end + 0.5 && endingSegment.start > hookSegment.end + 0.5) {
    return [openingSegment, hookSegment, endingSegment];
  }

  const twoPartHookLength = Math.max(4, safeTarget + crossfadeSeconds - adjustedEndingLength);
  const twoPartHook = getHookSegment({
    song,
    source,
    anchors,
    windows,
    length: twoPartHookLength,
    minStart: 0,
    maxEnd: endingSegment.start - Math.max(1, getBarSeconds(song) * 0.5),
  });

  if (endingSegment.start > twoPartHook.end + 0.5) {
    return [twoPartHook, endingSegment];
  }

  return [makeFixedSegment(Math.max(0, (anchors.hook ?? 0) - 1), safeTarget, duration)];
}

function renderCutdownBuffer({
  audioContext,
  source,
  segments,
  targetSeconds,
  crossfadeSeconds,
}: {
  audioContext: AudioContext;
  source: AudioBuffer;
  segments: CutSegment[];
  targetSeconds: number;
  crossfadeSeconds: number;
}) {
  const sampleRate = source.sampleRate;
  const targetFrames = Math.max(1, Math.floor(targetSeconds * sampleRate));
  const output = audioContext.createBuffer(source.numberOfChannels, targetFrames, sampleRate);
  const crossfadeFrames = segments.length > 1
    ? Math.min(Math.floor(crossfadeSeconds * sampleRate), Math.floor(targetFrames / 5))
    : 0;
  let outputOffset = 0;

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    const sourceStartFrame = Math.max(0, Math.floor(segment.start * sampleRate));
    const sourceEndFrame = Math.min(source.length, Math.floor(segment.end * sampleRate));
    const segmentFrames = Math.max(0, sourceEndFrame - sourceStartFrame);

    if (segmentFrames <= 0) continue;
    if (segmentIndex > 0) outputOffset -= crossfadeFrames;

    const fadeInFrames = segmentIndex > 0 ? Math.min(crossfadeFrames, segmentFrames) : 0;
    const fadeOutFrames = segmentIndex < segments.length - 1 ? Math.min(crossfadeFrames, segmentFrames) : 0;

    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      const inputData = source.getChannelData(channel);
      const outputData = output.getChannelData(channel);

      for (let frame = 0; frame < segmentFrames; frame += 1) {
        const destinationFrame = outputOffset + frame;
        if (destinationFrame < 0 || destinationFrame >= output.length) continue;

        let gain = 1;
        if (fadeInFrames > 0 && frame < fadeInFrames) {
          const progress = frame / Math.max(1, fadeInFrames);
          gain *= Math.sin((progress * Math.PI) / 2);
        }
        if (fadeOutFrames > 0 && frame > segmentFrames - fadeOutFrames) {
          const progress = (segmentFrames - frame) / Math.max(1, fadeOutFrames);
          gain *= Math.sin((progress * Math.PI) / 2);
        }

        outputData[destinationFrame] += inputData[sourceStartFrame + frame] * gain;
      }
    }

    outputOffset += segmentFrames;
  }

  applyEdgeFades(output);

  return output;
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
    const crossfadeSeconds = clamp(actualDurationSeconds * 0.045, 0.55, 1.4);
    const segments = buildCutdownSegments(song, decodedAudio, actualDurationSeconds, crossfadeSeconds);
    const shortenedBuffer = renderCutdownBuffer({
      audioContext,
      source: decodedAudio,
      segments,
      targetSeconds: actualDurationSeconds,
      crossfadeSeconds,
    });

    return {
      blob: audioBufferToWavBlob(shortenedBuffer),
      actualDurationSeconds,
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
      className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full p-[2px] text-[var(--text-primary)] transition hover:scale-[1.04] ${playing ? "scale-100" : "scale-[0.96]"}`}
      style={{
        background: `conic-gradient(var(--text-primary) ${progressDegrees}, var(--project-preview-track, color-mix(in srgb, var(--text-primary) 18%, transparent)) 0deg)`,
      }}
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--bg-primary)]">
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
  }, [isShortenedPreviewActive]);

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
        const remaining = current.filter((existing) => existing.durationSeconds !== targetSeconds);

        return [track, ...remaining].sort((a, b) => a.durationSeconds - b.durationSeconds);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to shorten track.");
    } finally {
      setGeneratingSeconds(null);
    }
  }

  function handlePreview(track: ShortenedTrack) {
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
              Choose a shorter version to generate. Filmwave builds a structure-aware cut from setup, hook, and ending moments.
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
                  const previewProgress =
                    isActive && duration > 0 && Number.isFinite(duration)
                      ? currentTime / duration
                      : 0;

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
                          {formatDuration(track.actualDurationSeconds)} cutdown · waveform ready
                        </span>
                      </span>

                      <PreviewButton
                        playing={isPreviewing}
                        progress={previewProgress}
                        label={isPreviewing ? `Pause ${track.label} version` : `Preview ${track.label} version`}
                        onClick={() => handlePreview(track)}
                      />
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
