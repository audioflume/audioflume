"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@clerk/nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import {
  estimateBpmWithEssentia,
  estimateKeyWithEssentia,
} from "@/lib/essentiaAnalysis";

const moodOptions = [
  "Adventurous",
  "Aggressive",
  "Anthemic",
  "Bright",
  "Burdened",
  "Chill",
  "Dark",
  "Dramatic",
  "Dreamy",
  "Eerie",
  "Emotional",
  "Empowering",
  "Energetic",
  "Epic",
  "Feel Good",
  "Fun",
  "Gritty",
  "Happy",
  "Heroic",
  "Hopeful",
  "Horror",
  "Inspirational",
  "Loving",
  "Mysterious",
  "Nostalgic",
  "Peaceful",
  "Playful",
  "Powerful",
  "Quirky",
  "Reflective",
  "Rebellious",
  "Romantic",
  "Sinister",
  "Sorrowful",
  "Soothing",
  "Spiritual",
  "Suspenseful",
  "Tense",
  "Triumphant",
  "Upbeat",
  "Uplifting",
  "Vintage",
  "Whimsical",
];

const genreOptions = [
  "Acoustic",
  "Ambient",
  "Background",
  "Blues",
  "Christmas",
  "Cinematic",
  "Classical",
  "Corporate",
  "Country",
  "Eastern",
  "Electronic",
  "Faith",
  "Film",
  "Folk",
  "Hip Hop",
  "Indie",
  "Jazz",
  "Lo-Fi",
  "Orchestral",
  "Pop",
  "R&B",
  "Rock",
  "Score",
  "Soul",
  "Trap",
  "World",
  "YouTube",
];

const instrumentOptions = [
  "Acoustic Guitar",
  "Banjo",
  "Bass",
  "Bells",
  "Cello",
  "Claps",
  "Drums",
  "Electronic",
  "Electric Guitar",
  "Flute",
  "Guitar",
  "Harp",
  "Horns",
  "Humming",
  "Organ",
  "Percussion",
  "Piano",
  "Saxophone",
  "Snaps",
  "Snare",
  "Strings",
  "Synth",
  "Trumpet",
  "Violin",
  "Whistling",
  "Woodwinds",
  "World",
];

const buildOptions = [
  "Steady",
  "Ascending",
  "Middle Crescendo",
  "Descending",
  "Multiple Crescendo",
];

const vocalsOptions = ["Male", "Female", "Acapella", "Choir", "Harmony"];

const keyOptions = [
  "Cmaj",
  "Cmin",
  "C#maj",
  "C#min",
  "Dbmaj",
  "Dbmin",
  "Dmaj",
  "Dmin",
  "D#maj",
  "D#min",
  "Ebmaj",
  "Ebmin",
  "Emaj",
  "Emin",
  "Fmaj",
  "Fmin",
  "F#maj",
  "F#min",
  "Gbmaj",
  "Gbmin",
  "Gmaj",
  "Gmin",
  "G#maj",
  "G#min",
  "Abmaj",
  "Abmin",
  "Amaj",
  "Amin",
  "A#maj",
  "A#min",
  "Bbmaj",
  "Bbmin",
  "Bmaj",
  "Bmin",
];

type AdminSongFormProps = {
  mode: "create" | "edit";
  songId?: string;
};

type UploadType = "audio" | "cover" | "stem";

type UploadResponse = {
  url: string;
  key: string;
  fileName: string;
  storedFileName?: string;
  contentType: string;
  size: number;
  type: UploadType;
  artist?: string;
  title?: string;
  artistSlug?: string;
  titleSlug?: string;
};

type UploadedFiles = {
  audio: UploadResponse | null;
  cover: UploadResponse | null;
  stems: UploadResponse[];
};

type SaveSongPayload = {
  title: string;
  artist: string;
  bpm: string;
  key: string;
  duration: string;
  audioUrl: string;
  coverUrl?: string | null;
  stemUrls?: string[];
  waveformPeaks: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  editPoints: string;
};

type SaveSongResponse = {
  id: string;
  fields: Record<string, unknown>;
};

type AdminSongRecord = {
  id: string;
  title: string;
  artist: string;
  bpm: string;
  key: string;
  duration: string;
  audioUrl: string;
  coverUrl: string;
  stemUrls: string[];
  waveformPeaks: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  editPoints: string;
};

type OnsetAnalysis = {
  envelope: number[];
  sampleRate: number;
  hopSize: number;
};

function getSongTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downsamplePeaks(peaks: number[], targetLength = 300) {
  if (peaks.length <= targetLength) {
    return peaks;
  }

  const downsampled: number[] = [];
  const blockSize = Math.floor(peaks.length / targetLength);

  for (let i = 0; i < targetLength; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let max = 0;

    for (let j = start; j < end && j < peaks.length; j++) {
      const abs = Math.abs(peaks[j]);

      if (abs > Math.abs(max)) {
        max = peaks[j];
      }
    }

    downsampled.push(Number(max.toFixed(6)));
  }

  return downsampled;
}

function normalizeObviousDoubleTimeBpm(rawBpm: number | null) {
  if (!rawBpm) return null;

  if (rawBpm > 140) {
    return Math.round(rawBpm / 2);
  }

  return Math.round(rawBpm);
}

function createOnsetEnvelope(audioBuffer: AudioBuffer): OnsetAnalysis {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const frameSize = 2048;
  const hopSize = 512;
  const energies: number[] = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    let energy = 0;

    for (let j = 0; j < frameSize; j++) {
      const sample = channelData[i + j];
      energy += sample * sample;
    }

    energies.push(Math.sqrt(energy / frameSize));
  }

  const envelope: number[] = [];

  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    envelope.push(diff > 0 ? diff : 0);
  }

  const sorted = [...envelope].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const max = Math.max(...envelope, 1);

  const cleaned = envelope.map((value) => {
    const reduced = Math.max(0, value - median);
    return reduced / max;
  });

  return {
    envelope: cleaned,
    sampleRate,
    hopSize,
  };
}

function estimateBpmFromOnsets(audioBuffer: AudioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const frameSize = 1024;
  const hopSize = 512;
  const energies: number[] = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    let energy = 0;

    for (let j = 0; j < frameSize; j++) {
      const sample = channelData[i + j];
      energy += sample * sample;
    }

    energies.push(energy / frameSize);
  }

  const onsets: number[] = [];

  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    onsets.push(diff > 0 ? diff : 0);
  }

  const averageOnset =
    onsets.reduce((sum, value) => sum + value, 0) / Math.max(1, onsets.length);

  const threshold = averageOnset * 1.8;
  const onsetTimes: number[] = [];

  for (let i = 0; i < onsets.length; i++) {
    if (onsets[i] > threshold) {
      const time = (i * hopSize) / sampleRate;
      const previousTime = onsetTimes[onsetTimes.length - 1];

      if (!previousTime || time - previousTime > 0.18) {
        onsetTimes.push(time);
      }
    }
  }

  if (onsetTimes.length < 4) return null;

  const intervals: number[] = [];

  for (let i = 1; i < onsetTimes.length; i++) {
    const interval = onsetTimes[i] - onsetTimes[i - 1];

    if (interval > 0.25 && interval < 2) {
      intervals.push(interval);
    }
  }

  if (!intervals.length) return null;

  const bpmCandidates = intervals
    .map((interval) => 60 / interval)
    .map((bpm) => {
      let normalized = bpm;

      while (normalized < 70) normalized *= 2;
      while (normalized > 180) normalized /= 2;

      return Math.round(normalized);
    });

  const counts = new Map<number, number>();

  for (const bpm of bpmCandidates) {
    counts.set(bpm, (counts.get(bpm) || 0) + 1);
  }

  let bestBpm: number | null = null;
  let bestCount = 0;

  for (const [bpm, count] of counts.entries()) {
    if (count > bestCount) {
      bestBpm = bpm;
      bestCount = count;
    }
  }

  return bestBpm;
}

function scoreBpmAgainstEnvelope(bpm: number, analysis: OnsetAnalysis) {
  const { envelope, sampleRate, hopSize } = analysis;
  const lag = Math.round(((60 / bpm) * sampleRate) / hopSize);

  if (lag < 2 || lag >= envelope.length) return 0;

  const start = Math.floor(envelope.length * 0.05);
  const end = Math.floor(envelope.length * 0.95);

  let score = 0;
  let count = 0;

  for (let i = start + lag; i < end; i++) {
    score += envelope[i] * envelope[i - lag];
    count++;
  }

  const halfLag = lag * 2;

  if (halfLag < envelope.length) {
    for (let i = start + halfLag; i < end; i++) {
      score += 0.45 * envelope[i] * envelope[i - halfLag];
      count++;
    }
  }

  const thirdLag = lag * 3;

  if (thirdLag < envelope.length) {
    for (let i = start + thirdLag; i < end; i++) {
      score += 0.25 * envelope[i] * envelope[i - thirdLag];
      count++;
    }
  }

  return count > 0 ? score / count : 0;
}

function proximityBonus(candidate: number, target: number | null, radius = 3) {
  if (!target) return 0;

  const distance = Math.abs(candidate - target);

  if (distance > radius) return 0;

  return (radius - distance) / radius;
}

function estimateBpmFromAutocorrelation(audioBuffer: AudioBuffer) {
  const analysis = createOnsetEnvelope(audioBuffer);

  let bestBpm: number | null = null;
  let bestScore = 0;

  for (let bpm = 55; bpm <= 180; bpm++) {
    const score = scoreBpmAgainstEnvelope(bpm, analysis);

    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }

  if (!bestBpm) {
    return {
      bpm: null,
      score: 0,
    };
  }

  let refinedBpm = bestBpm;
  let refinedScore = bestScore;

  const fineStart = Math.max(55, bestBpm - 4);
  const fineEnd = Math.min(180, bestBpm + 4);

  for (let bpm = fineStart; bpm <= fineEnd; bpm += 0.1) {
    const candidate = Number(bpm.toFixed(1));
    const score = scoreBpmAgainstEnvelope(candidate, analysis);

    if (score > refinedScore) {
      refinedBpm = candidate;
      refinedScore = score;
    }
  }

  const candidates = [refinedBpm, refinedBpm / 2, refinedBpm * 2]
    .filter((value) => value >= 55 && value <= 180)
    .map((value) => Number(value.toFixed(1)));

  for (const candidate of candidates) {
    const score = scoreBpmAgainstEnvelope(candidate, analysis);

    if (score > refinedScore) {
      refinedBpm = candidate;
      refinedScore = score;
    }
  }

  return {
    bpm: Math.round(refinedBpm),
    score: refinedScore,
  };
}

function chooseSuggestedBpm({
  autocorrBpm,
  normalizedEssentiaBpm,
  onsetBpm,
  audioBuffer,
}: {
  autocorrBpm: number | null;
  normalizedEssentiaBpm: number | null;
  onsetBpm: number | null;
  audioBuffer: AudioBuffer;
}) {
  const analysis = createOnsetEnvelope(audioBuffer);
  const candidateSet = new Set<number>();

  const addCandidateRange = (base: number | null) => {
    if (!base) return;

    for (let offset = -3; offset <= 3; offset++) {
      const candidate = base + offset;

      if (candidate >= 55 && candidate <= 180) {
        candidateSet.add(candidate);
      }
    }
  };

  addCandidateRange(autocorrBpm);
  addCandidateRange(normalizedEssentiaBpm);
  addCandidateRange(onsetBpm);

  if (!candidateSet.size) return null;

  let bestCandidate: number | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidateSet) {
    const envelopeScore = scoreBpmAgainstEnvelope(candidate, analysis);
    const consensusScore =
      proximityBonus(candidate, autocorrBpm, 3) * 0.4 +
      proximityBonus(candidate, normalizedEssentiaBpm, 3) * 0.25 +
      proximityBonus(candidate, onsetBpm, 3) * 0.2;

    const score = envelopeScore + consensusScore;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

async function generateWaveformPeaksFromFile(file: File, targetLength = 1500) {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const fullPeaks = Array.from(channelData);
  const optimizedPeaks = downsamplePeaks(fullPeaks, targetLength);

  const essentiaBpm = await estimateBpmWithEssentia(audioBuffer);
  const keyResult = await estimateKeyWithEssentia(audioBuffer);
  const normalizedEssentiaBpm = normalizeObviousDoubleTimeBpm(essentiaBpm);
  const onsetBpm = estimateBpmFromOnsets(audioBuffer);
  const autocorrResult = estimateBpmFromAutocorrelation(audioBuffer);
  const autocorrBpm = autocorrResult.bpm;

  const bpm = chooseSuggestedBpm({
    autocorrBpm,
    normalizedEssentiaBpm,
    onsetBpm,
    audioBuffer,
  });

  await audioContext.close();

  return {
    peaksJson: JSON.stringify(optimizedPeaks),
    duration: audioBuffer.duration,
    peakCount: optimizedPeaks.length,
    originalCount: fullPeaks.length,
    bpm,
    essentiaBpm,
    normalizedEssentiaBpm,
    onsetBpm,
    autocorrBpm,
    autocorrScore: autocorrResult.score,
    detectedKey: keyResult?.key ?? null,
    detectedKeyRaw: keyResult?.rawKey ?? null,
    detectedScale: keyResult?.scale ?? null,
    detectedKeyStrength: keyResult?.strength ?? null,
  };
}

async function resizeCoverImageToWebp(file: File) {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load cover image."));
      image.src = imageUrl;
    });

    const maxSize = 1200;
    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.round(image.width * ratio);
    const height = Math.round(image.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to process cover image.");
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });

    if (!blob) {
      throw new Error("Failed to compress cover image.");
    }

    return new File([blob], `${Date.now()}-cover.webp`, {
      type: "image/webp",
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function uploadAdminFile({
  file,
  type,
  artist,
  title,
  signal,
}: {
  file: File;
  type: UploadType;
  artist: string;
  title: string;
  signal?: AbortSignal;
}) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("type", type);
  formData.append("artist", artist);
  formData.append("title", title);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
    signal,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Upload failed");
  }

  return data as UploadResponse;
}

async function saveSongToSupabase({
  payload,
  signal,
}: {
  payload: SaveSongPayload;
  signal?: AbortSignal;
}) {
  const res = await fetch("/api/admin/songs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Failed to save song");
  }

  return data as SaveSongResponse;
}

async function updateSongInSupabase({
  songId,
  payload,
  signal,
}: {
  songId: string;
  payload: SaveSongPayload;
  signal?: AbortSignal;
}) {
  const res = await fetch(`/api/admin/songs/${songId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Failed to update song");
  }

  return data as SaveSongResponse;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  if (type === "number") {
    const currentValue = Number(value || 0);

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 pr-10 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)]"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col">
          <button
            type="button"
            onClick={() => onChange(String(currentValue + 1))}
            className="flex h-3.5 w-5 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Increase value"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 15L12 9L18 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onChange(String(Math.max(0, currentValue - 1)))}
            className="-mt-0.5 flex h-3.5 w-5 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Decrease value"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)]"
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 pr-10 text-xs outline-none transition focus:border-[var(--text-secondary)] ${
          value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        }`}
      >
        {children}
      </select>

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
      >
        <path
          d="M6 9L12 15L18 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function CheckboxInput({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`group flex h-9 cursor-pointer items-center gap-2.5 self-end rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs transition hover:text-[var(--text-primary)] ${
        checked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />

      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--bg-secondary)] transition group-hover:border-[var(--text-secondary)] peer-checked:border-[var(--text-primary)] peer-checked:bg-[var(--text-primary)] peer-checked:[&>svg]:opacity-100">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="opacity-0 text-[var(--bg-primary)] transition"
        >
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {label}
    </label>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      readOnly={readOnly}
      className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-xs leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] read-only:text-[var(--text-secondary)]"
    />
  );
}

function MultiSelectPills({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => {
              onChange(
                active
                  ? selected.filter((item) => item !== option)
                  : [...selected, option],
              );
            }}
            className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition ${
              active
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function UploadStatusIcon({
  status,
  isSaving,
}: {
  status: string;
  isSaving: boolean;
}) {
  if (isSaving) {
    return (
      <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border border-[var(--border)] border-t-[var(--text-primary)]" />
    );
  }

  if (status.toLowerCase().includes("failed")) {
    return (
      <div
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--status-error, #dc584f)" }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6L18 18M18 6L6 18"
            stroke="var(--status-contrast)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (
    status.toLowerCase().includes("saved") ||
    status.toLowerCase().includes("successfully") ||
    status.toLowerCase().includes("uploaded and saved")
  ) {
    return (
      <div
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--status-success, #48b571)" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17L4 12"
            stroke="var(--status-contrast)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return null;
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 12C20 16.4183 16.4183 20 12 20C9.61061 20 7.46589 18.9525 6 17.2916"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 12C4 7.58172 7.58172 4 12 4C14.3894 4 16.5341 5.04753 18 6.70838"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M18 3V7H14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 21V17H10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 8V13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M12 17H12.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10.29 4.86L2.82 18C2.31 18.89 2.95 20 3.98 20H20.02C21.05 20 21.69 18.89 21.18 18L13.71 4.86C13.2 3.95 10.8 3.95 10.29 4.86Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 16V4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M7 9L12 4L17 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AdminSongForm({ mode, songId }: AdminSongFormProps) {
  const { user, isLoaded } = useUser();
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);
  const isEditMode = mode === "edit";

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [bpm, setBpm] = useState("");
  const [songKey, setSongKey] = useState("");
  const [duration, setDuration] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [stemFiles, setStemFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState("");
  const [existingCoverUrl, setExistingCoverUrl] = useState("");
  const [existingStemUrls, setExistingStemUrls] = useState<string[]>([]);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [loadError, setLoadError] = useState("");

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const stemsInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedBuilds, setSelectedBuilds] = useState<string[]>([]);
  const [selectedVocals, setSelectedVocals] = useState<string[]>([]);
  const [instrumental, setInstrumental] = useState(false);
  const [waveformPeaks, setWaveformPeaks] = useState("");
  const [originalWaveformPeaks, setOriginalWaveformPeaks] = useState("");
  const [peakStatus, setPeakStatus] = useState("");
  const [isGeneratingPeaks, setIsGeneratingPeaks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [savedRecordId, setSavedRecordId] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    audio: null,
    cover: null,
    stems: [],
  });
  const [editPointsJson, setEditPointsJson] = useState(`{
  "markers": [],
  "ranges": []
}`);

  const uploadComplete = !!savedRecordId && !isSaving;

  const pageTitle = isEditMode ? "Edit Song" : "Add New Song";

  const pageDescription = isEditMode
    ? "Update song files, metadata, tags, waveform peaks, and edit point data."
    : "Upload audio, generate waveform peaks, add metadata, and prepare edit point data.";

  const statusTitle = isEditMode ? "Update Status" : "Upload Status";

  const submitLabel = isSaving
    ? isEditMode
      ? "Saving..."
      : "Uploading..."
    : uploadComplete
      ? isEditMode
        ? "Changes Saved"
        : "Upload New Song"
      : isEditMode
        ? "Save Changes"
        : "Upload Song";

  const uploadWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (!isEditMode && !audioFile) warnings.push("Audio file missing");
    if (isEditMode && !audioFile && !existingAudioUrl)
      warnings.push("Audio file missing");
    if (!title.trim()) warnings.push("Song title missing");
    if (!artist.trim()) warnings.push("Artist missing");
    if (!bpm.trim()) warnings.push("BPM missing");
    if (!songKey.trim()) warnings.push("Key missing");
    if (!duration.trim()) warnings.push("Duration missing");
    if (!waveformPeaks.trim()) warnings.push("Waveform peaks missing");
    if (selectedGenres.length === 0) warnings.push("Genre tags empty");
    if (selectedMoods.length === 0) warnings.push("Mood tags empty");
    if (selectedInstruments.length === 0)
      warnings.push("Instrument tags empty");
    if (selectedBuilds.length === 0) warnings.push("Build tags empty");
    if (!instrumental && selectedVocals.length === 0) {
      warnings.push("Vocals tags empty");
    }
    if (
      originalWaveformPeaks &&
      waveformPeaks &&
      waveformPeaks !== originalWaveformPeaks
    ) {
      warnings.push("Peak data has been modified");
    }

    return warnings;
  }, [
    isEditMode,
    audioFile,
    existingAudioUrl,
    title,
    artist,
    bpm,
    songKey,
    duration,
    waveformPeaks,
    originalWaveformPeaks,
    selectedGenres,
    selectedMoods,
    selectedInstruments,
    selectedBuilds,
    selectedVocals,
    instrumental,
  ]);

  useEffect(() => {
    if (!isEditMode || !songId || !isAdmin) return;

    let cancelled = false;

    async function loadSong() {
      setIsLoadingSong(true);
      setLoadError("");

      try {
        const res = await fetch(`/api/admin/songs/${songId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load song");
        }

        if (cancelled) return;

        const song = data as AdminSongRecord;

        setTitle(song.title || "");
        setArtist(song.artist || "");
        setBpm(song.bpm || "");
        setSongKey(song.key || "");
        setDuration(song.duration || "");
        setExistingAudioUrl(song.audioUrl || "");
        setExistingCoverUrl(song.coverUrl || "");
        setExistingStemUrls(song.stemUrls || []);
        setCoverPreview(song.coverUrl || null);
        setWaveformPeaks(song.waveformPeaks || "");
        setOriginalWaveformPeaks(song.waveformPeaks || "");
        setSelectedGenres(song.genres || []);
        setSelectedMoods(song.moods || []);
        setSelectedInstruments(song.instruments || []);
        setSelectedBuilds(song.builds || []);
        setSelectedVocals(song.vocals || []);
        setInstrumental(Boolean(song.instrumental));
        setEditPointsJson(
          song.editPoints ||
            `{
  "markers": [],
  "ranges": []
}`,
        );
        setSavedRecordId("");
        setUploadedFiles({
          audio: null,
          cover: null,
          stems: [],
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load song",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSong(false);
        }
      }
    }

    loadSong();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, songId, isAdmin]);

  useEffect(() => {
    if (!coverFile) {
      if (isEditMode && existingCoverUrl) {
        setCoverPreview(existingCoverUrl);
      } else {
        setCoverPreview(null);
      }

      return;
    }

    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [coverFile, existingCoverUrl, isEditMode]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  };

  const clearAudioFile = () => {
    setAudioFile(null);

    if (!isEditMode) {
      setWaveformPeaks("");
      setOriginalWaveformPeaks("");
      setPeakStatus("");
      setBpm("");
      setSongKey("");
      setDuration("");
    }

    setSavedRecordId("");
    setUploadedFiles({
      audio: null,
      cover: uploadedFiles.cover,
      stems: uploadedFiles.stems,
    });

    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  };

  const resetPage = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTitle("");
    setArtist("");
    setBpm("");
    setSongKey("");
    setDuration("");
    setAudioFile(null);
    setStemFiles([]);
    setCoverFile(null);
    setCoverPreview(null);
    setExistingAudioUrl("");
    setExistingCoverUrl("");
    setExistingStemUrls([]);
    setSelectedMoods([]);
    setSelectedGenres([]);
    setSelectedInstruments([]);
    setSelectedBuilds([]);
    setSelectedVocals([]);
    setInstrumental(false);
    setWaveformPeaks("");
    setOriginalWaveformPeaks("");
    setPeakStatus("");
    setIsGeneratingPeaks(false);
    setIsSaving(false);
    setSaveStatus("");
    setSavedRecordId("");
    setToastMessage(null);
    setWarningsOpen(false);
    setUploadedFiles({
      audio: null,
      cover: null,
      stems: [],
    });
    setEditPointsJson(`{
  "markers": [],
  "ranges": []
}`);

    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }

    if (stemsInputRef.current) {
      stemsInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    uploadAbortControllerRef.current?.abort();
    uploadAbortControllerRef.current = null;
    setIsSaving(false);
    setSaveStatus(isEditMode ? "Update cancelled." : "Upload cancelled.");
  };

  const handleAudioFileChange = async (file: File | null) => {
    setAudioFile(file);
    setWaveformPeaks("");
    setOriginalWaveformPeaks("");
    setPeakStatus("");
    setBpm("");
    setSongKey("");
    setDuration("");
    setSavedRecordId("");
    setWarningsOpen(false);
    setUploadedFiles({
      audio: null,
      cover: uploadedFiles.cover,
      stems: uploadedFiles.stems,
    });

    if (file) {
      setTitle(getSongTitleFromFileName(file.name));
    }

    if (!file) return;

    setIsGeneratingPeaks(true);
    setPeakStatus("Generating waveform peaks and estimating BPM/key...");

    try {
      const result = await generateWaveformPeaksFromFile(file, 1500);

      setWaveformPeaks(result.peaksJson);
      setOriginalWaveformPeaks(result.peaksJson);
      setDuration(formatDuration(result.duration));

      if (result.bpm) {
        setBpm(String(result.bpm));
      }

      if (result.detectedKey && keyOptions.includes(result.detectedKey)) {
        setSongKey(result.detectedKey);
      }

      setPeakStatus(
        `Generated ${result.peakCount.toLocaleString()} peaks from ${result.originalCount.toLocaleString()} samples${
          result.bpm ? ` and suggested ${result.bpm} BPM` : ""
        }${
          result.essentiaBpm || result.onsetBpm || result.autocorrBpm
            ? ` — detections: autocorr ${result.autocorrBpm ?? "n/a"}, Essentia raw ${result.essentiaBpm ?? "n/a"}, Essentia normalized ${result.normalizedEssentiaBpm ?? "n/a"}, onset ${result.onsetBpm ?? "n/a"}, key ${result.detectedKey ?? "n/a"}.`
            : "."
        }`,
      );
    } catch (err) {
      setPeakStatus(
        err instanceof Error
          ? `Failed to generate peaks/BPM/key: ${err.message}`
          : "Failed to generate peaks/BPM/key.",
      );
    } finally {
      setIsGeneratingPeaks(false);
    }
  };

  const handleStemFilesChange = (files: FileList | null) => {
    setStemFiles(files ? Array.from(files) : []);
    setSavedRecordId("");
    setUploadedFiles({
      audio: uploadedFiles.audio,
      cover: uploadedFiles.cover,
      stems: [],
    });
  };

  const clearStemFiles = () => {
    setStemFiles([]);
    setSavedRecordId("");
    setUploadedFiles({
      audio: uploadedFiles.audio,
      cover: uploadedFiles.cover,
      stems: [],
    });

    if (stemsInputRef.current) {
      stemsInputRef.current.value = "";
    }
  };

  const copyWaveformPeaks = async () => {
    if (!waveformPeaks) return;

    await navigator.clipboard.writeText(waveformPeaks);
    showToast("Copied to clipboard");
  };

  const getAudioFileForPeakGeneration = async () => {
    if (audioFile) return audioFile;

    if (!existingAudioUrl) return null;

    const proxyUrl = `/api/admin/audio-proxy?url=${encodeURIComponent(existingAudioUrl)}`;
    const res = await fetch(proxyUrl);

    if (!res.ok) {
      let message = "Failed to load the existing audio file.";

      try {
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await res.json();
          message = data?.error || message;
        } else {
          message = `Audio proxy failed with status ${res.status}. Check that app/api/admin/audio-proxy/route.ts exists and compiled correctly.`;
        }
      } catch {
        message = `Audio proxy failed with status ${res.status}.`;
      }

      throw new Error(message);
    }

    const blob = await res.blob();
    const fileName = `${title.trim() || "existing-audio"}.mp3`;

    return new File([blob], fileName, {
      type: blob.type || "audio/mpeg",
    });
  };

  const reAnalyzeWaveformPeaks = async () => {
    setIsGeneratingPeaks(true);
    setPeakStatus("Re-analyzing waveform peaks and estimating BPM/key...");

    try {
      const fileForAnalysis = await getAudioFileForPeakGeneration();

      if (!fileForAnalysis) {
        setPeakStatus("Please choose an audio file before re-analyzing.");
        return;
      }

      const result = await generateWaveformPeaksFromFile(fileForAnalysis, 1500);

      setWaveformPeaks(result.peaksJson);
      setOriginalWaveformPeaks(result.peaksJson);
      setDuration(formatDuration(result.duration));

      if (result.bpm) {
        setBpm(String(result.bpm));
      }

      if (result.detectedKey && keyOptions.includes(result.detectedKey)) {
        setSongKey(result.detectedKey);
      }

      setPeakStatus(
        `Re-generated ${result.peakCount.toLocaleString()} peaks from ${result.originalCount.toLocaleString()} samples${
          result.bpm ? ` and suggested ${result.bpm} BPM` : ""
        }${
          result.essentiaBpm || result.onsetBpm || result.autocorrBpm
            ? ` — detections: autocorr ${result.autocorrBpm ?? "n/a"}, Essentia raw ${result.essentiaBpm ?? "n/a"}, Essentia normalized ${result.normalizedEssentiaBpm ?? "n/a"}, onset ${result.onsetBpm ?? "n/a"}, key ${result.detectedKey ?? "n/a"}.`
            : "."
        }`,
      );
    } catch (err) {
      setPeakStatus(
        err instanceof Error
          ? `Failed to re-analyze peaks/BPM/key: ${err.message}`
          : "Failed to re-analyze peaks/BPM/key.",
      );
    } finally {
      setIsGeneratingPeaks(false);
    }
  };

  const handleSaveSong = async () => {
    setSaveStatus("");
    setSavedRecordId("");
    setUploadedFiles({
      audio: null,
      cover: null,
      stems: [],
    });

    if (!isEditMode && !audioFile) {
      setSaveStatus("Please choose a main audio file before saving.");
      return;
    }

    if (isEditMode && !audioFile && !existingAudioUrl) {
      setSaveStatus("Please choose a main audio file before saving.");
      return;
    }

    if (!title.trim()) {
      setSaveStatus("Please add a song title before saving.");
      return;
    }

    if (!artist.trim()) {
      setSaveStatus("Please add an artist before saving.");
      return;
    }

    if (!waveformPeaks.trim()) {
      setSaveStatus("Please generate waveform peaks before saving.");
      return;
    }

    const abortController = new AbortController();
    uploadAbortControllerRef.current = abortController;

    try {
      setIsSaving(true);

      const cleanArtist = artist.trim();
      const cleanTitle = title.trim();

      let audioUpload: UploadResponse | null = null;
      let coverUpload: UploadResponse | null = null;
      let stemUploads: UploadResponse[] = [];

      if (audioFile) {
        setSaveStatus("Uploading main audio to Cloudflare...");

        audioUpload = await uploadAdminFile({
          file: audioFile,
          type: "audio",
          artist: cleanArtist,
          title: cleanTitle,
          signal: abortController.signal,
        });
      }

      if (coverFile) {
        setSaveStatus("Optimizing cover image...");

        const optimizedCoverFile = await resizeCoverImageToWebp(coverFile);

        setSaveStatus("Uploading cover image to Cloudflare...");

        coverUpload = await uploadAdminFile({
          file: optimizedCoverFile,
          type: "cover",
          artist: cleanArtist,
          title: cleanTitle,
          signal: abortController.signal,
        });
      }

      if (stemFiles.length > 0) {
        setSaveStatus(
          `Uploading ${stemFiles.length} stem file${stemFiles.length === 1 ? "" : "s"} to Cloudflare...`,
        );

        stemUploads = await Promise.all(
          stemFiles.map((file) =>
            uploadAdminFile({
              file,
              type: "stem",
              artist: cleanArtist,
              title: cleanTitle,
              signal: abortController.signal,
            }),
          ),
        );
      }

      const finalAudioUrl = audioUpload?.url || existingAudioUrl;
      const finalCoverUrl = coverUpload?.url || existingCoverUrl || null;
      const finalStemUrls =
        stemUploads.length > 0
          ? stemUploads.map((stem) => stem.url)
          : existingStemUrls;

      setUploadedFiles({
        audio: audioUpload,
        cover: coverUpload,
        stems: stemUploads,
      });

      setSaveStatus(isEditMode ? "Saving changes..." : "Saving song...");

      const payload: SaveSongPayload = {
        title: cleanTitle,
        artist: cleanArtist,
        bpm,
        key: songKey,
        duration,
        audioUrl: finalAudioUrl,
        coverUrl: finalCoverUrl,
        stemUrls: finalStemUrls,
        waveformPeaks,
        genres: selectedGenres,
        moods: selectedMoods,
        instruments: selectedInstruments,
        builds: selectedBuilds,
        vocals: selectedVocals,
        instrumental,
        editPoints: editPointsJson,
      };

      const savedSong =
        isEditMode && songId
          ? await updateSongInSupabase({
              songId,
              payload,
              signal: abortController.signal,
            })
          : await saveSongToSupabase({
              payload,
              signal: abortController.signal,
            });

      setSavedRecordId(savedSong.id);
      setExistingAudioUrl(finalAudioUrl);
      setExistingCoverUrl(finalCoverUrl || "");
      setExistingStemUrls(finalStemUrls);
      setOriginalWaveformPeaks(waveformPeaks);
      setWarningsOpen(false);
      setSaveStatus(
        isEditMode ? "Song changes saved." : "Song uploaded and saved.",
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setSaveStatus(isEditMode ? "Update cancelled." : "Upload cancelled.");
        return;
      }

      setSaveStatus(
        err instanceof Error
          ? `${isEditMode ? "Update" : "Save"} failed: ${err.message}`
          : `${isEditMode ? "Update" : "Save"} failed.`,
      );
    } finally {
      uploadAbortControllerRef.current = null;
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
        <div className="px-8 pt-8 text-sm text-[var(--text-secondary)]">
          Loading...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
        <div className="px-8 pt-14">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Not authorized
          </h1>

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            You do not have access to this admin page.
          </p>
        </div>
      </main>
    );
  }

  if (isEditMode && isLoadingSong) {
    return (
      <main className="relative min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
        <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
          <LoadingSpinner size={32} stroke={7} color="var(--text-primary)" />
        </div>
      </main>
    );
  }

  if (isEditMode && loadError) {
    return (
      <main className="relative min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
        <div className="px-8 pt-14">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Edit Song
          </h1>

          <p className="mt-4 text-sm text-[var(--status-error)]">{loadError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
      <style>{`
        .admin-song-form-card {
          overflow: hidden;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .admin-song-form-card-header {
          display: flex;
          min-height: 40px;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
          padding: 0 1rem;
        }

        .admin-song-form-kicker {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .admin-song-form-icon-btn {
          display: flex;
          height: 28px;
          width: 28px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 0;
          background: transparent;
          color: var(--icon-color);
          transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
        }

        .admin-song-form-icon-btn:hover,
        .admin-song-form-icon-btn.is-open {
          background: var(--icon-button-hover);
          color: var(--text-primary);
        }

        .admin-song-file-row {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.75rem;
          border-top: 1px solid var(--border-subtle);
          padding: 0.75rem 1rem;
        }

        .admin-song-file-row:first-child {
          border-top: 0;
        }

        @media (max-width: 900px) {
          .admin-song-file-row {
            grid-template-columns: 1fr;
            align-items: start;
          }
        }
      `}</style>

      <div
        className="px-8 pt-14"
        style={{
          paddingBottom: playerVisible ? "152px" : "80px",
        }}
      >
        <div className="flex items-end justify-between gap-4 pb-8">
          <div className="min-w-0">
            <div>
              <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
                {pageTitle}
              </h1>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {pageDescription}
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {uploadWarnings.length > 0 && !uploadComplete ? (
              <div className="flex h-8 items-center gap-2 rounded-full bg-[var(--status-error-soft)] px-3 text-xs font-medium text-[var(--status-error)]">
                <WarningIcon />
                <span>
                  {uploadWarnings.length} warning
                  {uploadWarnings.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : (
              <div className="flex h-8 items-center gap-2 rounded-full bg-[var(--status-success-soft)] px-3 text-xs font-medium text-[var(--status-success)]">
                <span className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
                <span>Ready</span>
              </div>
            )}
          </div>
        </div>

        <form
          className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
          onSubmit={(e) => {
            e.preventDefault();

            if (uploadComplete && !isEditMode) {
              resetPage();
              return;
            }

            handleSaveSong();
          }}
        >
          <div className="grid min-w-0 gap-4">
            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div>
                  <div className="admin-song-form-kicker">Files</div>
                </div>
              </div>

              <div>
                <div className="admin-song-file-row">
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      {isEditMode ? "Replace Audio" : "Audio File"}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Main track source
                    </div>
                  </div>

                  <div className="min-w-0">
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) =>
                        handleAudioFileChange(e.target.files?.[0] ?? null)
                      }
                      className="hidden"
                    />

                    <div className="flex h-9 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
                      >
                        Choose
                      </button>

                      <span className="truncate text-xs text-[var(--text-secondary)]">
                        {audioFile
                          ? audioFile.name
                          : isEditMode && existingAudioUrl
                            ? "Current audio file will be kept"
                            : "No file chosen"}
                      </span>
                    </div>

                    {isEditMode && existingAudioUrl && !audioFile && (
                      <a
                        href={existingAudioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block truncate text-[11px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                      >
                        {existingAudioUrl}
                      </a>
                    )}

                    {peakStatus && (
                      <div className="mt-2 flex items-start gap-2">
                        {isGeneratingPeaks && (
                          <div className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border border-[var(--border)] border-t-[var(--text-primary)]" />
                        )}

                        <p className="text-[11px] leading-5 text-[var(--text-secondary)]">
                          {peakStatus}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    {audioFile && (
                      <button
                        type="button"
                        onClick={clearAudioFile}
                        disabled={isGeneratingPeaks || isSaving}
                        className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-song-file-row">
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      {isEditMode ? "Replace Cover" : "Cover Image"}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Artwork preview
                    </div>
                  </div>

                  <div className="min-w-0">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setCoverFile(e.target.files?.[0] ?? null);
                        setSavedRecordId("");
                        setUploadedFiles({
                          audio: uploadedFiles.audio,
                          cover: null,
                          stems: uploadedFiles.stems,
                        });
                      }}
                      className="hidden"
                    />

                    <div className="flex h-9 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
                      >
                        Choose
                      </button>

                      <span className="truncate text-xs text-[var(--text-secondary)]">
                        {coverFile
                          ? coverFile.name
                          : isEditMode && existingCoverUrl
                            ? "Current cover image will be kept"
                            : "No file chosen"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    {coverPreview && (
                      <div className="h-9 w-9 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    {(coverFile || coverPreview) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverFile(null);
                          setExistingCoverUrl("");
                          setCoverPreview(null);
                          setSavedRecordId("");
                          setUploadedFiles({
                            audio: uploadedFiles.audio,
                            cover: null,
                            stems: uploadedFiles.stems,
                          });

                          if (coverInputRef.current) {
                            coverInputRef.current.value = "";
                          }
                        }}
                        className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-song-file-row">
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      {isEditMode ? "Replace Stems" : "Stems"}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Alt mixes / instrumentals
                    </div>
                  </div>

                  <div className="min-w-0">
                    <input
                      ref={stemsInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={(e) => handleStemFilesChange(e.target.files)}
                      className="hidden"
                    />

                    <div className="flex h-9 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                      <button
                        type="button"
                        onClick={() => stemsInputRef.current?.click()}
                        className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
                      >
                        Choose
                      </button>

                      <span className="truncate text-xs text-[var(--text-secondary)]">
                        {stemFiles.length > 0
                          ? `${stemFiles.length} file${stemFiles.length === 1 ? "" : "s"} chosen`
                          : isEditMode && existingStemUrls.length > 0
                            ? `${existingStemUrls.length} current stem${existingStemUrls.length === 1 ? "" : "s"} will be kept`
                            : "No file chosen"}
                      </span>
                    </div>

                    {stemFiles.length > 0 && (
                      <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-muted)]">
                        {stemFiles.slice(0, 3).map((file) => (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="truncate"
                          >
                            {file.name}
                          </div>
                        ))}
                        {stemFiles.length > 3 && (
                          <div>+ {stemFiles.length - 3} more</div>
                        )}
                      </div>
                    )}

                    {isEditMode &&
                      existingStemUrls.length > 0 &&
                      stemFiles.length === 0 && (
                        <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-muted)]">
                          {existingStemUrls.slice(0, 3).map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate transition hover:text-[var(--text-primary)]"
                            >
                              {url}
                            </a>
                          ))}
                          {existingStemUrls.length > 3 && (
                            <div>+ {existingStemUrls.length - 3} more</div>
                          )}
                        </div>
                      )}
                  </div>

                  <div className="flex justify-end">
                    {stemFiles.length > 0 ? (
                      <button
                        type="button"
                        onClick={clearStemFiles}
                        className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        Remove
                      </button>
                    ) : (
                      isEditMode &&
                      existingStemUrls.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setExistingStemUrls([]);
                            setSavedRecordId("");
                          }}
                          className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                        >
                          Remove
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div className="admin-song-form-kicker">Song Info</div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <FieldLabel>Song Title</FieldLabel>
                  <TextInput
                    value={title}
                    onChange={setTitle}
                    placeholder="Example: Ember Drift"
                  />
                </div>

                <div>
                  <FieldLabel>Artist</FieldLabel>
                  <TextInput
                    value={artist}
                    onChange={setArtist}
                    placeholder="Example: Lumen Fade"
                  />
                </div>

                <div>
                  <FieldLabel>BPM</FieldLabel>
                  <TextInput
                    value={bpm}
                    onChange={setBpm}
                    placeholder="110"
                    type="number"
                  />
                </div>

                <div>
                  <FieldLabel>Key</FieldLabel>
                  <SelectInput value={songKey} onChange={setSongKey}>
                    <option value="">Select key</option>
                    {keyOptions.map((keyOption) => (
                      <option key={keyOption} value={keyOption}>
                        {keyOption}
                      </option>
                    ))}
                  </SelectInput>
                </div>

                <div>
                  <FieldLabel>Duration</FieldLabel>
                  <TextInput
                    value={duration}
                    onChange={setDuration}
                    placeholder="2:11"
                  />
                </div>

                <div>
                  <FieldLabel>Type</FieldLabel>
                  <CheckboxInput
                    checked={instrumental}
                    onChange={setInstrumental}
                    label="Instrumental"
                  />
                </div>
              </div>
            </section>

            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div>
                  <div className="admin-song-form-kicker">Waveform Peaks</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={reAnalyzeWaveformPeaks}
                    disabled={
                      (!audioFile && !existingAudioUrl) ||
                      isGeneratingPeaks ||
                      isSaving
                    }
                    aria-label="Re-analyze waveform peaks"
                    className="admin-song-form-icon-btn disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--icon-color)]"
                  >
                    <RefreshIcon />
                  </button>

                  <button
                    type="button"
                    onClick={copyWaveformPeaks}
                    disabled={!waveformPeaks}
                    aria-label="Copy waveform peaks"
                    className="admin-song-form-icon-btn disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--icon-color)]"
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <p className="mb-3 text-xs leading-5 text-[var(--text-secondary)]">
                  {isEditMode
                    ? "Existing peak data is loaded from Supabase. Re-analyze only when needed."
                    : "Generated automatically from the selected audio file using the same 300-point peak format."}
                </p>

                <TextArea
                  value={waveformPeaks}
                  onChange={setWaveformPeaks}
                  rows={5}
                  readOnly={isGeneratingPeaks}
                  placeholder="Waveform peak JSON will appear here after selecting an audio file."
                />
              </div>
            </section>

            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div className="admin-song-form-kicker">Tags</div>
              </div>

              <div className="grid gap-5 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <FieldLabel>Genre</FieldLabel>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {selectedGenres.length} selected
                    </span>
                  </div>
                  <MultiSelectPills
                    options={genreOptions}
                    selected={selectedGenres}
                    onChange={setSelectedGenres}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <FieldLabel>Mood</FieldLabel>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {selectedMoods.length} selected
                    </span>
                  </div>
                  <MultiSelectPills
                    options={moodOptions}
                    selected={selectedMoods}
                    onChange={setSelectedMoods}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <FieldLabel>Instrument</FieldLabel>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {selectedInstruments.length} selected
                    </span>
                  </div>
                  <MultiSelectPills
                    options={instrumentOptions}
                    selected={selectedInstruments}
                    onChange={setSelectedInstruments}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <FieldLabel>Build</FieldLabel>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {selectedBuilds.length} selected
                      </span>
                    </div>
                    <MultiSelectPills
                      options={buildOptions}
                      selected={selectedBuilds}
                      onChange={setSelectedBuilds}
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <FieldLabel>Vocals</FieldLabel>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {selectedVocals.length} selected
                      </span>
                    </div>
                    <MultiSelectPills
                      options={vocalsOptions}
                      selected={selectedVocals}
                      onChange={setSelectedVocals}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div className="admin-song-form-kicker">Edit Points</div>
              </div>

              <div className="p-4">
                <p className="mb-3 text-xs leading-5 text-[var(--text-secondary)]">
                  Temporary manual JSON field. Later this can be generated by AI
                  and reviewed here.
                </p>

                <TextArea
                  value={editPointsJson}
                  onChange={setEditPointsJson}
                  rows={8}
                  placeholder='{"markers":[],"ranges":[]}'
                />
              </div>
            </section>
          </div>

          <aside className="grid h-fit gap-4 xl:sticky xl:top-[88px]">
            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div className="admin-song-form-kicker">Checklist</div>
              </div>

              <div className="grid gap-2 p-4">
                {uploadWarnings.length > 0 && !uploadComplete ? (
                  <>
                    <div className="rounded-lg bg-[rgba(220,88,79,0.08)] p-3 text-xs leading-5 text-[#dc584f]">
                      <div className="flex items-center gap-2 font-medium">
                        <WarningIcon />
                        <span>
                          {uploadWarnings.length} item
                          {uploadWarnings.length === 1 ? "" : "s"} need
                          attention
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                        {uploadWarnings[0]}
                        {uploadWarnings.length > 1
                          ? ` + ${uploadWarnings.length - 1} more`
                          : ""}
                      </div>

                      {uploadWarnings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setWarningsOpen((current) => !current)}
                          className="mt-2 text-[11px] font-medium text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
                        >
                          {warningsOpen ? "Hide warnings" : "Show warnings"}
                        </button>
                      )}
                    </div>

                    {warningsOpen && uploadWarnings.length > 1 && (
                      <ul className="grid gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                        {uploadWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg bg-[rgba(72,181,113,0.08)] p-3 text-xs font-medium text-[#48b571]">
                    Ready to save
                  </div>
                )}
              </div>
            </section>

            {(saveStatus ||
              uploadedFiles.audio ||
              uploadedFiles.cover ||
              uploadedFiles.stems.length > 0) && (
              <section className="admin-song-form-card">
                <div className="admin-song-form-card-header">
                  <div className="admin-song-form-kicker">{statusTitle}</div>
                </div>

                <div className="grid gap-3 p-4">
                  {saveStatus && (
                    <div className="flex items-start gap-2 rounded-lg bg-[var(--bg-tertiary)] p-3">
                      <UploadStatusIcon
                        status={saveStatus}
                        isSaving={isSaving}
                      />

                      <p className="text-xs leading-5 text-[var(--text-secondary)]">
                        {saveStatus}
                      </p>
                    </div>
                  )}

                  {savedRecordId && (
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      Song ID: {savedRecordId}
                    </p>
                  )}

                  {(uploadedFiles.audio ||
                    uploadedFiles.cover ||
                    uploadedFiles.stems.length > 0) && (
                    <div className="grid gap-2 text-[11px] text-[var(--text-secondary)]">
                      {uploadedFiles.audio && (
                        <a
                          href={uploadedFiles.audio.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate rounded-lg bg-[var(--bg-primary)] px-3 py-2 transition hover:text-[var(--text-primary)]"
                        >
                          Main audio uploaded
                        </a>
                      )}

                      {uploadedFiles.cover && (
                        <a
                          href={uploadedFiles.cover.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate rounded-lg bg-[var(--bg-primary)] px-3 py-2 transition hover:text-[var(--text-primary)]"
                        >
                          Cover uploaded
                        </a>
                      )}

                      {uploadedFiles.stems.length > 0 && (
                        <div className="rounded-lg bg-[var(--bg-primary)] px-3 py-2">
                          {uploadedFiles.stems.length} stem
                          {uploadedFiles.stems.length === 1 ? "" : "s"} uploaded
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="admin-song-form-card">
              <div className="admin-song-form-card-header">
                <div className="admin-song-form-kicker">Actions</div>
              </div>

              <div className="grid gap-2 p-4">
                {isSaving && (
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className={`w-full ${secondaryPillButtonClass}`}
                  >
                    Cancel
                  </button>
                )}

                <button
                  type={uploadComplete && !isEditMode ? "button" : "submit"}
                  onClick={
                    uploadComplete && !isEditMode ? resetPage : undefined
                  }
                  disabled={isSaving || isGeneratingPeaks}
                  className={`w-full ${primaryPillButtonClass} disabled:cursor-default disabled:opacity-50`}
                >
                  {!isSaving && <UploadIcon />}
                  <span>{submitLabel}</span>
                </button>
              </div>
            </section>
          </aside>
        </form>
      </div>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "96px" : "24px"}
      />
    </main>
  );
}
