"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/lib/types";
import ModalShell from "@/components/ModalShell";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";

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

type NaturalSegment = {
  start: number;
  length: number;
};

type NaturalBlendPlan = {
  segments: NaturalSegment[];
  crossfadeSeconds: number;
  mode: "continuous" | "matched_blend";
};

type EnergyFrame = {
  time: number;
  rms: number;
  peak: number;
  zcr: number;
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
    let peak = 0;
    let crossings = 0;
    let previous = getMonoSample(channels, startFrame);
    let count = 0;

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const value = getMonoSample(channels, frame);
      sum += value * value;
      peak = Math.max(peak, Math.abs(value));

      if ((previous < 0 && value >= 0) || (previous >= 0 && value < 0)) {
        crossings += 1;
      }

      previous = value;
      count += 1;
    }

    frames.push({
      time: startFrame / buffer.sampleRate,
      rms: count > 0 ? Math.sqrt(sum / count) : 0,
      peak,
      zcr: count > 0 ? crossings / count : 0,
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

function findBestContinuousStart(buffer: AudioBuffer, frames: EnergyFrame[], length: number) {
  const duration = buffer.duration;
  const maxStart = Math.max(0, duration - length);
  const searchMin = duration > length + 12 ? Math.min(maxStart, duration * 0.08) : 0;
  const searchMax = duration > length + 12 ? Math.max(searchMin, duration - length - duration * 0.08) : maxStart;
  let bestStart = 0;
  let bestScore = -Infinity;

  for (let start = searchMin; start <= searchMax; start += 0.5) {
    const end = start + length;
    const middleEnergy = averageEnergy(frames, start, end);
    const { startEnergy, endEnergy } = edgeEnergy(frames, start, end);
    const timelinePosition = maxStart > 0 ? start / maxStart : 0;
    const avoidExtremeEnds = 1 - Math.abs(timelinePosition - 0.48);
    const edgePenalty = Math.abs(startEnergy - middleEnergy) * 0.35 + Math.abs(endEnergy - middleEnergy) * 0.55;
    const score = middleEnergy + avoidExtremeEnds * middleEnergy * 0.18 - edgePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return clamp(bestStart, 0, maxStart);
}

function getTopSegmentStarts({
  buffer,
  frames,
  length,
  minStart,
  maxStart,
  count,
  preferLater = false,
}: {
  buffer: AudioBuffer;
  frames: EnergyFrame[];
  length: number;
  minStart: number;
  maxStart: number;
  count: number;
  preferLater?: boolean;
}) {
  const duration = buffer.duration;
  const safeMin = clamp(minStart, 0, Math.max(0, duration - length));
  const safeMax = clamp(maxStart, safeMin, Math.max(safeMin, duration - length));
  const candidates: Array<{ start: number; score: number }> = [];

  for (let start = safeMin; start <= safeMax; start += 0.75) {
    const end = start + length;
    const energy = averageEnergy(frames, start, end);
    const { startEnergy, endEnergy } = edgeEnergy(frames, start, end);
    const position = safeMax > safeMin ? (start - safeMin) / (safeMax - safeMin) : 0;
    const endSmoothness = Math.max(0, 1 - Math.abs(endEnergy - energy) / Math.max(0.001, energy));
    const timelineBias = preferLater ? position * energy * 0.22 : (1 - Math.abs(position - 0.42)) * energy * 0.12;
    const score = energy + endSmoothness * energy * 0.15 + timelineBias - Math.abs(startEnergy - energy) * 0.24;

    candidates.push({ start, score });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, all) =>
      all.findIndex((item) => Math.abs(item.start - candidate.start) < 4) === index,
    )
    .slice(0, count)
    .map((candidate) => candidate.start);
}

function getTextureVector(buffer: AudioBuffer, time: number, length: number, before: boolean) {
  const sampleRate = buffer.sampleRate;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  const vectorSize = 24;
  const startTime = before ? time - length : time;
  const startFrame = clamp(Math.floor(startTime * sampleRate), 0, Math.max(0, buffer.length - 1));
  const endFrame = clamp(Math.floor((startTime + length) * sampleRate), startFrame + 1, buffer.length);
  const windowFrames = Math.max(1, Math.floor((endFrame - startFrame) / vectorSize));
  const vector: number[] = [];
  let totalRms = 0;
  let totalZcr = 0;

  for (let vectorIndex = 0; vectorIndex < vectorSize; vectorIndex += 1) {
    const frameStart = startFrame + vectorIndex * windowFrames;
    const frameEnd = Math.min(endFrame, frameStart + windowFrames);
    let sum = 0;
    let crossings = 0;
    let previous = getMonoSample(channels, frameStart);
    let count = 0;

    for (let frame = frameStart; frame < frameEnd; frame += 1) {
      const value = getMonoSample(channels, frame);
      sum += value * value;

      if ((previous < 0 && value >= 0) || (previous >= 0 && value < 0)) {
        crossings += 1;
      }

      previous = value;
      count += 1;
    }

    const rms = count > 0 ? Math.sqrt(sum / count) : 0;
    const zcr = count > 0 ? crossings / count : 0;
    totalRms += rms;
    totalZcr += zcr;
    vector.push(rms, zcr);
  }

  const averageRms = totalRms / vectorSize;
  const averageZcr = totalZcr / vectorSize;

  return {
    vector,
    averageRms,
    averageZcr,
  };
}

function getJoinDistance(buffer: AudioBuffer, firstEnd: number, secondStart: number, crossfadeSeconds: number) {
  const outgoing = getTextureVector(buffer, firstEnd, crossfadeSeconds, true);
  const incoming = getTextureVector(buffer, secondStart, crossfadeSeconds, false);
  const outgoingScale = Math.max(0.0001, outgoing.averageRms);
  const incomingScale = Math.max(0.0001, incoming.averageRms);
  const scale = Math.max(outgoingScale, incomingScale);
  let vectorDistance = 0;

  for (let index = 0; index < outgoing.vector.length; index += 1) {
    const isRms = index % 2 === 0;
    const normalizer = isRms ? scale : Math.max(0.0001, outgoing.averageZcr + incoming.averageZcr);
    const difference = (outgoing.vector[index] - incoming.vector[index]) / normalizer;
    vectorDistance += difference * difference;
  }

  vectorDistance = Math.sqrt(vectorDistance / outgoing.vector.length);

  const loudnessRatio = Math.abs(Math.log(outgoingScale / incomingScale));
  const zcrDifference = Math.abs(outgoing.averageZcr - incoming.averageZcr) / Math.max(0.0001, outgoing.averageZcr + incoming.averageZcr);

  return vectorDistance * 0.72 + loudnessRatio * 0.2 + zcrDifference * 0.08;
}

function findMatchedBlendPlan(buffer: AudioBuffer, frames: EnergyFrame[], targetSeconds: number) {
  const duration = buffer.duration;
  const crossfadeSeconds = clamp(targetSeconds * 0.07, 0.8, 2.4);
  const endingLength = clamp(targetSeconds * 0.28, targetSeconds <= 20 ? 4 : 7, targetSeconds <= 20 ? 5.5 : 15);
  const firstLength = targetSeconds + crossfadeSeconds - endingLength;
  const minimumGap = Math.max(5, crossfadeSeconds * 3);

  if (duration < targetSeconds + minimumGap + 8 || firstLength <= 3 || endingLength <= 3) {
    return null;
  }

  const firstStarts = getTopSegmentStarts({
    buffer,
    frames,
    length: firstLength,
    minStart: duration * 0.05,
    maxStart: duration - firstLength - endingLength - minimumGap,
    count: 8,
  });
  const secondStarts = getTopSegmentStarts({
    buffer,
    frames,
    length: endingLength,
    minStart: Math.max(duration * 0.45, targetSeconds),
    maxStart: duration - endingLength,
    count: 12,
    preferLater: true,
  });
  let bestPlan: NaturalBlendPlan | null = null;
  let bestScore = Infinity;

  for (const firstStart of firstStarts) {
    const firstEnd = firstStart + firstLength;

    for (const secondStart of secondStarts) {
      if (secondStart <= firstEnd + minimumGap) continue;

      const distance = getJoinDistance(buffer, firstEnd, secondStart, crossfadeSeconds);
      const secondEnergy = averageEnergy(frames, secondStart, secondStart + endingLength);
      const firstEnergy = averageEnergy(frames, firstStart, firstEnd);
      const energyBalance = Math.abs(Math.log(Math.max(0.0001, firstEnergy) / Math.max(0.0001, secondEnergy)));
      const score = distance + energyBalance * 0.12;

      if (score < bestScore) {
        bestScore = score;
        bestPlan = {
          mode: "matched_blend",
          crossfadeSeconds,
          segments: [
            { start: firstStart, length: firstLength },
            { start: secondStart, length: endingLength },
          ],
        };
      }
    }
  }

  if (!bestPlan) return null;

  return bestScore <= 0.58 ? bestPlan : null;
}

function copySegment({
  source,
  output,
  segment,
  outputStartSeconds,
  fadeInSeconds,
  fadeOutSeconds,
}: {
  source: AudioBuffer;
  output: AudioBuffer;
  segment: NaturalSegment;
  outputStartSeconds: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}) {
  const sampleRate = source.sampleRate;
  const sourceStartFrame = Math.max(0, Math.floor(segment.start * sampleRate));
  const segmentFrames = Math.min(
    Math.floor(segment.length * sampleRate),
    source.length - sourceStartFrame,
  );
  const outputStartFrame = Math.floor(outputStartSeconds * sampleRate);
  const fadeInFrames = Math.min(Math.floor(fadeInSeconds * sampleRate), segmentFrames);
  const fadeOutFrames = Math.min(Math.floor(fadeOutSeconds * sampleRate), segmentFrames);

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const sourceData = source.getChannelData(channel);
    const outputData = output.getChannelData(channel);

    for (let frame = 0; frame < segmentFrames; frame += 1) {
      const destinationFrame = outputStartFrame + frame;
      if (destinationFrame < 0 || destinationFrame >= output.length) continue;

      let gain = 1;

      if (fadeInFrames > 0 && frame < fadeInFrames) {
        gain *= Math.sin((frame / Math.max(1, fadeInFrames)) * Math.PI * 0.5);
      }

      if (fadeOutFrames > 0 && frame > segmentFrames - fadeOutFrames) {
        gain *= Math.sin(((segmentFrames - frame) / Math.max(1, fadeOutFrames)) * Math.PI * 0.5);
      }

      outputData[destinationFrame] += sourceData[sourceStartFrame + frame] * gain;
    }
  }
}

function applyEdgeFades(buffer: AudioBuffer) {
  const fadeInFrames = Math.min(Math.floor(buffer.sampleRate * 0.04), Math.floor(buffer.length / 4));
  const fadeOutFrames = Math.min(Math.floor(buffer.sampleRate * 1.45), Math.floor(buffer.length / 3));

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

function renderNaturalShort(buffer: AudioBuffer, audioContext: AudioContext, targetSeconds: number) {
  const actualDurationSeconds = Math.min(targetSeconds, buffer.duration);
  const output = audioContext.createBuffer(
    buffer.numberOfChannels,
    Math.max(1, Math.floor(actualDurationSeconds * buffer.sampleRate)),
    buffer.sampleRate,
  );
  const frames = getEnergyFrames(buffer);
  const matchedPlan = findMatchedBlendPlan(buffer, frames, actualDurationSeconds);
  const plan: NaturalBlendPlan = matchedPlan ?? {
    mode: "continuous",
    crossfadeSeconds: 0,
    segments: [
      {
        start: findBestContinuousStart(buffer, frames, actualDurationSeconds),
        length: actualDurationSeconds,
      },
    ],
  };

  if (plan.mode === "continuous") {
    copySegment({
      source: buffer,
      output,
      segment: plan.segments[0],
      outputStartSeconds: 0,
      fadeInSeconds: 0,
      fadeOutSeconds: 0,
    });
  } else {
    copySegment({
      source: buffer,
      output,
      segment: plan.segments[0],
      outputStartSeconds: 0,
      fadeInSeconds: 0,
      fadeOutSeconds: plan.crossfadeSeconds,
    });
    copySegment({
      source: buffer,
      output,
      segment: plan.segments[1],
      outputStartSeconds: plan.segments[0].length - plan.crossfadeSeconds,
      fadeInSeconds: plan.crossfadeSeconds,
      fadeOutSeconds: 0,
    });
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
    const shortenedBuffer = renderNaturalShort(decodedAudio, audioContext, targetSeconds);
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
  }, [isShortenedPreviewActive, generatedTracks, currentSong?.id, isPlaying, isOpen]);

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
              Choose a shorter version to generate. Filmwave now prefers natural continuous sections or one similarity-matched blend instead of cue-point cuts.
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
                          {formatDuration(track.actualDurationSeconds)} natural blend · waveform ready
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
