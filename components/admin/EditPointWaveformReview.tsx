"use client";

import { useMemo, useRef, useState } from "react";

type EditPointMarker = {
  id: string;
  type: string;
  time: number;
  label: string;
  confidence: number;
  source: string;
};

type EditPointWaveformReviewProps = {
  audioUrl: string | null;
  waveformPeaks: string;
  duration: number;
  markers: EditPointMarker[];
};

function formatTime(secondsValue: number) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, "0")}`;
}

function parsePeaks(value: string) {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => Math.abs(Number(item)))
      .filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
}

function downsample(values: number[], targetLength = 220) {
  if (values.length <= targetLength) return values;

  const result: number[] = [];
  const blockSize = values.length / targetLength;

  for (let index = 0; index < targetLength; index++) {
    const start = Math.floor(index * blockSize);
    const end = Math.min(values.length, Math.floor((index + 1) * blockSize));
    let max = 0;

    for (let itemIndex = start; itemIndex < end; itemIndex++) {
      max = Math.max(max, values[itemIndex] || 0);
    }

    result.push(max);
  }

  return result;
}

function normalizePeaks(values: number[]) {
  const max = Math.max(...values, 1);

  return values.map((value) => value / max);
}

function clampTime(time: number, duration: number) {
  if (!Number.isFinite(time)) return 0;
  if (!duration || !Number.isFinite(duration) || duration <= 0) return Math.max(0, time);

  return Math.max(0, Math.min(duration, time));
}

export default function EditPointWaveformReview({
  audioUrl,
  waveformPeaks,
  duration,
  markers,
}: EditPointWaveformReviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const peaks = useMemo(() => {
    return normalizePeaks(downsample(parsePeaks(waveformPeaks), 240));
  }, [waveformPeaks]);

  const effectiveDuration = duration > 0 ? duration : audioRef.current?.duration || 0;
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio || !audioUrl) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seekToTime = (time: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    const nextTime = clampTime(time, effectiveDuration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const seekFromPointer = (clientX: number) => {
    const timeline = timelineRef.current;

    if (!timeline || effectiveDuration <= 0) return;

    const rect = timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    seekToTime(percent * effectiveDuration);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Waveform Review
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Play the track, click markers to jump to cues, or click the waveform to seek.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-[var(--text-secondary)]">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </div>

          <button
            type="button"
            onClick={togglePlayback}
            disabled={!audioUrl}
            className="h-8 rounded-full border border-[var(--border)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        role="button"
        tabIndex={0}
        onClick={(event) => seekFromPointer(event.clientX)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") seekToTime(currentTime - 1);
          if (event.key === "ArrowRight") seekToTime(currentTime + 1);
        }}
        className="relative h-28 cursor-pointer overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] outline-none transition focus:border-[var(--text-secondary)]"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />

        <div className="absolute inset-0 flex items-center gap-px px-3">
          {peaks.length > 0 ? (
            peaks.map((peak, index) => (
              <span
                key={`${index}-${peak}`}
                className="flex-1 rounded-full bg-[var(--text-muted)] opacity-40"
                style={{ height: `${Math.max(6, peak * 72)}px` }}
              />
            ))
          ) : (
            <div className="w-full text-center text-xs text-[var(--text-muted)]">
              No waveform peak data available.
            </div>
          )}
        </div>

        <div
          className="pointer-events-none absolute top-0 h-full w-px bg-[var(--text-primary)]"
          style={{ left: `${Math.max(0, Math.min(100, progress))}%` }}
        >
          <div className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--text-primary)]" />
        </div>

        {markers.map((marker) => {
          const left = effectiveDuration > 0 ? (marker.time / effectiveDuration) * 100 : 0;

          return (
            <button
              key={marker.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                seekToTime(marker.time);
              }}
              className="absolute top-0 h-full w-5 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0"
              style={{ left: `${Math.max(0, Math.min(100, left))}%` }}
              title={`${marker.label} — ${formatTime(marker.time)}`}
            >
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--accent)]" />
              <span className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_0_3px_rgba(221,255,67,0.16)]" />
              <span className="sr-only">
                Seek to {marker.label} at {formatTime(marker.time)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            onClick={() => seekToTime(marker.time)}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {marker.label} · {formatTime(marker.time)}
          </button>
        ))}
      </div>
    </div>
  );
}
